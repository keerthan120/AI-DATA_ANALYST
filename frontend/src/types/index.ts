export type UserRole = "Admin" | "Analyst" | "Viewer";

export interface ColumnInfo {
  name: string;
  dtype: string;
  null_count: number;
  unique_count: number;
  sample_values?: any[];
  min_value?: any;
  max_value?: any;
  mean_value?: number;
}

export interface TableSchema {
  table_name: string;
  file_name: string;
  file_path: string;
  row_count: number;
  column_count: number;
  columns: ColumnInfo[];
  preview_rows: Record<string, any>[];
}

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "scatter" | "area" | "histogram" | "none";
  title: string;
  x_key: string;
  y_keys: string[];
  x_label?: string;
  y_label?: string;
  description?: string;
}

export interface AnomalyRecord {
  record_index: number;
  column_name: string;
  value: any;
  score: number;
  method: string;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  responsePayload?: ChatResponse;
}

export interface ChatResponse {
  session_id: string;
  query_type: string;
  natural_language_answer: string;
  reasoning_steps: string[];
  sql_query?: string;
  python_code?: string;
  data_preview: Record<string, any>[];
  total_data_rows: number;
  insights: string[];
  chart?: ChartConfig;
  anomalies: AnomalyRecord[];
  guardrail_status: {
    passed: boolean;
    violations: string[];
  };
  execution_time_ms: number;
}
