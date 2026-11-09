from typing import Any, Optional, TypedDict
from app.models.schemas import ChartConfig, AnomalyRecord, UserRole

class AgentState(TypedDict, total=False):
    # User Inputs
    session_id: str
    message: str
    table_names: list[str]
    user_role: UserRole
    api_key: Optional[str]
    model: Optional[str]
    conversation_history: list[dict[str, str]]

    # Routing & Context
    intent: str
    schema_context: str
    selected_tables: list[str]

    # Analysis & Code Execution
    sql_query: Optional[str]
    python_code: Optional[str]
    data_results: list[dict[str, Any]]
    total_data_rows: int
    execution_error: Optional[str]

    # Visualizations & Anomalies
    chart: Optional[ChartConfig]
    anomalies: list[AnomalyRecord]

    # Reasoning & Synthesis
    reasoning_steps: list[str]
    insights: list[str]
    natural_language_answer: str

    # Security & Guardrails
    guardrail_status: dict[str, Any]
    execution_time_ms: float

