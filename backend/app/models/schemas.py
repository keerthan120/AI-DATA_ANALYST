from typing import Any, Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum

class ColumnInfo(BaseModel):
    name: str
    dtype: str
    null_count: int
    unique_count: int
    sample_values: list[Any] = []
    min_value: Optional[Any] = None
    max_value: Optional[Any] = None
    mean_value: Optional[float] = None

class TableSchema(BaseModel):
    table_name: str
    file_name: str
    file_path: str
    row_count: int
    column_count: int
    columns: list[ColumnInfo]
    preview_rows: list[dict[str, Any]] = []

class UploadResponse(BaseModel):
    success: bool
    message: str
    tables: list[TableSchema]

class ChartType(str, Enum):
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    SCATTER = "scatter"
    AREA = "area"
    HISTOGRAM = "histogram"
    NONE = "none"

class ChartConfig(BaseModel):
    type: ChartType = ChartType.NONE
    title: str = ""
    x_key: str = ""
    y_keys: list[str] = []
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    group_by: Optional[str] = None
    description: Optional[str] = None

class AnomalyRecord(BaseModel):
    record_index: int
    column_name: str
    value: Any
    score: float = Field(description="Z-score or deviation metric")
    method: str = Field(description="Detection method e.g. IQR, Z-Score, IsolationForest")
    explanation: str

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    session_id: str = "default-session"
    message: str
    table_names: list[str] = []
    api_key: Optional[str] = None
    model: Optional[str] = None
    conversation_history: list[ChatMessage] = []

class ChatResponse(BaseModel):
    session_id: str
    query_type: str = Field(
        description="Type of analysis: e.g., aggregation, trend, anomaly, ranking, comparison, general"
    )
    natural_language_answer: str
    reasoning_steps: list[str] = []
    sql_query: Optional[str] = None
    python_code: Optional[str] = None
    data_preview: list[dict[str, Any]] = []
    total_data_rows: int = 0
    insights: list[str] = []
    chart: Optional[ChartConfig] = None
    anomalies: list[AnomalyRecord] = []
    guardrail_status: dict[str, Any] = {"passed": True, "violations": []}
    execution_time_ms: float = 0.0

class StoredMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    responsePayload: Optional[ChatResponse] = None

class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0

class ConversationDetail(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    messages: list[StoredMessage] = []

class AnomalyDetectRequest(BaseModel):
    table_name: str
    column_names: list[str] = []
    method: Literal["iqr", "zscore", "isolation_forest", "auto"] = "auto"
    threshold: float = 2.5

