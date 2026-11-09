import { TableSchema, ChatResponse, UserRole, AnomalyRecord } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function uploadFiles(files: File[]): Promise<TableSchema[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload files.");
  }

  const data = await res.json();
  return data.tables;
}

export async function fetchTables(): Promise<TableSchema[]> {
  const res = await fetch(`${API_BASE}/tables`);
  if (!res.ok) {
    throw new Error("Failed to load tables.");
  }
  return res.json();
}

export async function loadSampleDatasets(): Promise<TableSchema[]> {
  const res = await fetch(`${API_BASE}/load-samples`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to load sample datasets.");
  }
  const data = await res.json();
  return data.tables;
}

export async function sendChatMessage(params: {
  sessionId?: string;
  message: string;
  tableNames: string[];
  userRole: UserRole;
  apiKey?: string;
  model?: string;
  conversationHistory?: { role: string; content: string }[];
}): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": params.userRole,
    },
    body: JSON.stringify({
      session_id: params.sessionId || "default-session",
      message: params.message,
      table_names: params.tableNames,
      user_role: params.userRole,
      api_key: params.apiKey || null,
      model: params.model || null,
      conversation_history: params.conversationHistory || [],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Agent failed to process request.");
  }

  return res.json();
}

export async function detectAnomalies(params: {
  tableName: string;
  columnNames?: string[];
  method?: string;
  threshold?: number;
}): Promise<AnomalyRecord[]> {
  const res = await fetch(`${API_BASE}/detect-anomalies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      table_name: params.tableName,
      column_names: params.columnNames || [],
      method: params.method || "auto",
      threshold: params.threshold || 2.5,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to run anomaly detection.");
  }

  return res.json();
}

