import json
import time
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.agents.graph import agent_graph
from app.agents.cache_manager import query_cache
from app.engine.duckdb_engine import db_engine
from app.agents.anomaly_agent import AnomalyDetectionAgent
from app.db.session import get_db, engine, Base
from app.db.models import Conversation, ChatMessageModel, ensure_db_schema
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    AnomalyDetectRequest,
    AnomalyRecord,
    ConversationSummary,
    ConversationDetail,
    StoredMessage,
)

# Ensure database schema is migrated and up-to-date
ensure_db_schema()

router = APIRouter(prefix="/api", tags=["Agent Chat & Analysis"])

@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Returns all persisted chat conversations from the database.
    If user_id is provided, filters for that user's recent chats plus unassigned guest chats.
    """
    query = db.query(Conversation)
    if user_id:
        query = query.filter((Conversation.user_id == user_id) | (Conversation.user_id == None))
    convs = query.order_by(Conversation.updated_at.desc()).all()
    results = []
    for c in convs:
        count = db.query(ChatMessageModel).filter(ChatMessageModel.conversation_id == c.id).count()
        results.append(ConversationSummary(
            id=c.id,
            title=c.title,
            created_at=c.created_at.isoformat() if c.created_at else datetime.utcnow().isoformat(),
            updated_at=c.updated_at.isoformat() if c.updated_at else datetime.utcnow().isoformat(),
            message_count=count,
            active_tables=c.get_tables_list()
        ))
    return results

@router.post("/conversations", response_model=ConversationSummary)
def create_conversation(payload: dict = {}, db: Session = Depends(get_db)):
    """
    Creates a new persistent conversation in the database.
    """
    conv_id = payload.get("id") or str(uuid.uuid4())
    title = payload.get("title") or "New Analysis"
    user_id = payload.get("user_id")
    conv = Conversation(id=conv_id, title=title, user_id=user_id, active_tables="[]")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
        message_count=0,
        active_tables=[]
    )

@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """
    Retrieves full conversation history and message payloads from the database.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    messages_db = db.query(ChatMessageModel).filter(
        ChatMessageModel.conversation_id == conversation_id
    ).order_by(ChatMessageModel.created_at.asc()).all()

    stored_messages = []
    for m in messages_db:
        payload = None
        if m.response_payload:
            try:
                payload = json.loads(m.response_payload)
            except Exception:
                pass
        
        stored_messages.append(StoredMessage(
            id=m.id,
            role=m.role,
            content=m.content,
            timestamp=m.created_at.strftime("%I:%M %p") if m.created_at else "",
            responsePayload=payload
        ))

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
        active_tables=conv.get_tables_list(),
        messages=stored_messages
    )

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """
    Permanently deletes a conversation and its messages from the database.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    db.delete(conv)
    db.commit()
    return {"success": True, "message": "Conversation deleted successfully."}

@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Executes the multi-agent LangGraph workflow and saves user questions and
    assistant insights/charts/SQL permanently into the database.
    """
    if not request.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")

    # 1. Ensure conversation exists in DB and attach user_id
    session_id = request.session_id or str(uuid.uuid4())
    conv = db.query(Conversation).filter(Conversation.id == session_id).first()
    if not conv:
        title = request.message.strip()
        if len(title) > 38:
            title = title[:38] + "..."
        conv = Conversation(
            id=session_id,
            title=title,
            user_id=request.user_id,
            active_tables=json.dumps(request.table_names)
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
    else:
        if request.user_id and not conv.user_id:
            conv.user_id = request.user_id
        if request.table_names:
            existing = conv.get_tables_list()
            merged = list(dict.fromkeys(existing + request.table_names))
            conv.set_tables_list(merged)
        db.commit()

    # 2. Persist User Message to DB
    user_msg = ChatMessageModel(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role="user",
        content=request.message.strip(),
        response_payload=None,
        created_at=datetime.utcnow()
    )
    db.add(user_msg)
    db.commit()

    # 3. Check LRU Cache
    cached = query_cache.get(request.message, request.table_names)
    if cached:
        response = ChatResponse(**cached)
        response.session_id = conv.id
        response.reasoning_steps = ["[Cache Hit] Returned pre-computed deterministic results from memory (<1ms)."] + response.reasoning_steps

        # Save assistant message
        assistant_msg = ChatMessageModel(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="assistant",
            content=response.natural_language_answer,
            response_payload=response.model_dump_json(),
            created_at=datetime.utcnow()
        )
        db.add(assistant_msg)
        conv.updated_at = datetime.utcnow()
        db.commit()
        return response

    # 4. Initialize graph state
    active_tables = request.table_names or conv.get_tables_list()
    if not active_tables:
        active_tables = list(db_engine.registered_tables.keys())

    initial_state = {
        "session_id": conv.id,
        "message": request.message,
        "table_names": active_tables,
        "api_key": request.api_key,
        "model": request.model,
        "conversation_history": [m.model_dump() for m in request.conversation_history],
        "start_time": time.time(),
        "reasoning_steps": []
    }

    try:
        final_state = agent_graph.invoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Agent workflow error: {str(e)}")

    response = ChatResponse(
        session_id=conv.id,
        query_type=final_state.get("intent", "data_analysis"),
        natural_language_answer=final_state.get("natural_language_answer", "Analysis finished."),
        reasoning_steps=final_state.get("reasoning_steps", []),
        sql_query=final_state.get("sql_query"),
        python_code=final_state.get("python_code"),
        data_preview=final_state.get("data_results", []),
        total_data_rows=final_state.get("total_data_rows", 0),
        insights=final_state.get("insights", []),
        chart=final_state.get("chart"),
        anomalies=final_state.get("anomalies", []),
        guardrail_status=final_state.get("guardrail_status", {"passed": True, "violations": []}),
        execution_time_ms=final_state.get("execution_time_ms", 0.0)
    )

    # 5. Persist Assistant Response and Payload to DB
    assistant_msg = ChatMessageModel(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role="assistant",
        content=response.natural_language_answer,
        response_payload=response.model_dump_json(),
        created_at=datetime.utcnow()
    )
    db.add(assistant_msg)
    conv.updated_at = datetime.utcnow()
    db.commit()

    # Cache response
    query_cache.set(request.message, request.table_names, response.model_dump())

    return response

@router.post("/cache/clear")
def clear_cache():
    query_cache.clear()
    return {"success": True, "message": "Query cache cleared successfully."}

@router.post("/detect-anomalies", response_model=list[AnomalyRecord])
async def detect_table_anomalies(request: AnomalyDetectRequest):
    """
    Direct anomaly detection endpoint for running IQR, Z-Score, or Isolation Forest on specific columns.
    """
    df = db_engine.get_dataframe(request.table_name)
    if df.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Table '{request.table_name}' not found or empty.")

    target_cols = request.column_names if request.column_names else None
    return AnomalyDetectionAgent.detect_anomalies(df, target_columns=target_cols, method=request.method, threshold=request.threshold)
