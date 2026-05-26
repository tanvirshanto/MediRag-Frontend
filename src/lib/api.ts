import type {
  LoginRequest, TokenResponse, UploadBulkResponse, UploadJobResponse,
  UploadListResponse, UserCreate, UserResponse, UserUpdate, StreamEvent,
  SystemLog,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export function getApiUrl(): string { return API_URL; }

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function handle401() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  if (typeof window !== "undefined") window.dispatchEvent(new Event("auth-expired"));
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...((options.headers || {}) as Record<string, string>),
    },
  });
  if (!res.ok) {
    if (res.status === 401) handle401();
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──
export async function login(body: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Invalid credentials");
  }
  return res.json();
}

// ── Uploads ──
export async function uploadPdfs(files: File[]): Promise<UploadBulkResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch(`${API_URL}/uploads/upload-pdf`, {
    method: "POST", headers: { ...authHeaders() }, body: form,
  });
  if (!res.ok) {
    if (res.status === 401) handle401();
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Upload failed");
  }
  return res.json();
}

export function fetchUploadsList(status?: string, limit = 50, offset = 0): Promise<UploadListResponse> {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  p.set("limit", String(limit)); p.set("offset", String(offset));
  return apiFetch(`/uploads?${p.toString()}`);
}

export function fetchUploadJob(jobId: string): Promise<UploadJobResponse> {
  return apiFetch(`/uploads/${jobId}`);
}

export function retryJob(jobId: string): Promise<UploadJobResponse> {
  return apiFetch(`/uploads/${jobId}/retry`, { method: "POST" });
}

export function fetchRunningJob(): Promise<UploadJobResponse | null> {
  return apiFetch("/uploads/running");
}

// ── Users ──
export function createUser(body: UserCreate): Promise<UserResponse> {
  return apiFetch("/users", { method: "POST", body: JSON.stringify(body) });
}
export function listUsers(): Promise<UserResponse[]> { return apiFetch("/users"); }
export function updateUser(userId: string, body: UserUpdate): Promise<UserResponse> {
  return apiFetch(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(body) });
}
export function deleteUser(userId: string): Promise<void> {
  return apiFetch(`/users/${userId}`, { method: "DELETE" });
}

// ── System Logs ──
export function fetchSystemLogs(limit = 100, offset = 0): Promise<SystemLog[]> {
  const p = new URLSearchParams();
  p.set("limit", String(limit));
  p.set("offset", String(offset));
  return apiFetch(`/system-logs?${p.toString()}`);
}

// ── Ask (streaming) ──
export async function* streamAsk(question: string, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${API_URL}/ask?stream=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question }), signal,
  });
  if (!res.ok) {
    if (res.status === 401) handle401();
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Ask request failed");
  }
  if (!res.body) throw new Error("No response body from stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try { yield JSON.parse(line.slice(6)) as StreamEvent; } catch { /* skip */ }
    }
  }
}
