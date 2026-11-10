import { TableSchema, ChatResponse, AnomalyRecord, UserProfile, AuthResponse, ConversationItem, ConversationDetail } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

// Conversation Persistence (Database)
export async function fetchConversations(userId?: number): Promise<ConversationItem[]> {
  const url = userId ? `${API_BASE}/conversations?user_id=${userId}` : `${API_BASE}/conversations`;
  const res = await fetch(url);
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function createConversation(payload: { id?: string; title?: string; user_id?: number } = {}): Promise<ConversationItem> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to create conversation in database.");
  }
  return res.json();
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch conversation history from database.");
  }
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  await fetch(`${API_BASE}/conversations/${id}`, {
    method: "DELETE",
  });
}

// CSV Data & Ingestion
export async function uploadFiles(files: File[], conversationId?: string, userId?: number): Promise<TableSchema[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (conversationId) {
    formData.append("conversation_id", conversationId);
  }
  if (userId) {
    formData.append("user_id", String(userId));
  }

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

export async function fetchTables(conversationId?: string): Promise<TableSchema[]> {
  const url = conversationId ? `${API_BASE}/tables?conversation_id=${conversationId}` : `${API_BASE}/tables`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load tables.");
  }
  return res.json();
}

export async function sendChatMessage(params: {
  sessionId?: string;
  message: string;
  tableNames: string[];
  userId?: number;
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
      user_id: params.userId,
      conversation_history: params.conversationHistory || [],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Agent failed to process request.");
  }

  return res.json();
}

// Authentication
export async function registerUser(data: { email: string; password: string; full_name?: string; fullName?: string; phone_number?: string; phoneNumber?: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      full_name: data.full_name || data.fullName,
      phone_number: data.phone_number || data.phoneNumber,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Registration failed.");
  }
  return res.json();
}

export async function loginUser(data: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Login failed.");
  }
  return res.json();
}

export async function verify2FA(data: { email: string; code: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "2-Step Verification failed.");
  }
  return res.json();
}

export async function updateProfileApi(data: {
  email: string;
  full_name?: string;
  phone_number?: string;
  company?: string;
  role?: string;
  is_2fa_enabled?: boolean;
  current_password?: string;
  new_password?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update profile.");
  }
  return res.json();
}

export async function clearCacheApi(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/cache/clear`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Failed to clear cache.");
  }
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string; reset_token?: string }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Password reset request failed.");
  }
  return res.json();
}

export async function resetPassword(data: { token?: string; resetToken?: string; new_password?: string; newPassword?: string; email?: string }): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: data.token || data.resetToken,
      new_password: data.new_password || data.newPassword,
      email: data.email,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Password reset failed.");
  }
  return res.json();
}
