import { TableSchema, ChatResponse, AnomalyRecord, UserProfile, AuthResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

// CSV Data & Ingestion
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

export async function sendChatMessage(params: {
  sessionId?: string;
  message: string;
  tableNames: string[];
  conversationHistory?: { role: string; content: string }[];
}): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: params.sessionId || "default-session",
      message: params.message,
      table_names: params.tableNames,
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

// User Authentication (PostgreSQL 16)
export async function registerUser(payload: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      full_name: payload.fullName || null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed.");
  return data;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Invalid email or password.");
  return data;
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string; reset_token?: string }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to request reset token.");
  return data;
}

export async function resetPassword(payload: {
  email: string;
  resetToken: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email,
      reset_token: payload.resetToken,
      new_password: payload.newPassword,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to reset password.");
  return data;
}
