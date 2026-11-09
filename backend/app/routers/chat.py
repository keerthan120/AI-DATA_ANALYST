import time
from fastapi import APIRouter, HTTPException, status
from app.agents.graph import agent_graph
from app.engine.duckdb_engine import db_engine
from app.agents.anomaly_agent import AnomalyDetectionAgent
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    AnomalyDetectRequest,
    AnomalyRecord
)

router = APIRouter(prefix="/api", tags=["Agent Chat & Analysis"])

@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """
    Executes the multi-agent LangGraph workflow:
    - Input guardrail validation
    - Schema context retrieval & multi-table join key detection
    - Code / SQL generation and deterministic DuckDB execution
    - Statistical anomaly detection & explanation
    - Structured visualization configuration
    - Business insight synthesis & step-by-step reasoning
    """
    if not request.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")

    # Initialize graph state
    initial_state = {
        "session_id": request.session_id,
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

    return ChatResponse(
        session_id=request.session_id,
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

