import json
import time
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.agents.graph import agent_graph
from app.engine.duckdb_engine import db_engine
from app.agents.anomaly_agent import AnomalyDetectionAgent
from app.db.session import get_db, engine, Base
from app.db.models import Conversation, ChatMessageModel
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    AnomalyDetectRequest,
    AnomalyRecord,
    ConversationSummary,
    ConversationDetail,
    StoredMessage,
)

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/api", tags=["Agent Chat & Analysis"])

@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(db: Session = Depends(get_db)):
    """
    Returns all persisted chat conversations from the database ordered by most recently updated.
    """
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    results = []
    for c in convs:
        count = db.query(ChatMessageModel).filter(ChatMessageModel.conversation_id == c.id).count()
        results.append(ConversationSummary(
            id=c.id,
            title=c.title,
            created_at=c.created_at.isoformat() if c.created_at else datetime.utcnow().isoformat(),
            updated_at=c.updated_at.isoformat() if c.updated_at else datetime.utcnow().isoformat(),
            message_count=count
        ))
    return results

@router.post("/conversations", response_model=ConversationSummary)
def create_conversation(payload: dict = {}, db: Session = Depends(get_db)):
    """
    Creates a new persistent conversation in the database.
    """
    conv_id = payload.get("id") or str(uuid.uuid4())
    title = payload.get("title") or "New Analysis"
    conv = Conversation(id=conv_id, title=title)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
        message_count=0
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

    # 1. Ensure conversation exists in DB
    session_id = request.session_id or str(uuid.uuid4())
    conv = db.query(Conversation).filter(Conversation.id == session_id).first()
    if not conv:
        # Title generated from first prompt
        title = request.message.strip()
        if len(title) > 38:
            title = title[:38] + "..."
        conv = Conversation(id=session_id, title=title)
        db.add(conv)
        db.commit()
        db.refresh(conv)

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

    # 3. Initialize graph state
    initial_state = {
        "session_id": conv.id,
        "message": request.message,
        "table_names": request.table_names,
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

    # 4. Persist Assistant Response and Payload to DB
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

@router.post("/detect-anomalies", response_model=list[AnomalyRecord])
async def detect_table_anomalies(request: AnomalyDetectRequest):
    """
    Direct anomaly detection endpoint for running IQR, Z-Score, or Isolation Forest on specific columns.
    """
    available_tables = [t.table_name for t in db_engine.get_registered_tables_info()]
    if request.table_name not in available_tables:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{request.table_name}' not found. Available tables: {available_tables}"
        )

    df = db_engine.get_dataframe(request.table_name)
    anomalies = AnomalyDetectionAgent.detect_anomalies(
        df=df,
        numeric_columns=request.column_names,
        method=request.method,
        z_threshold=request.threshold
    )
    return anomalies
