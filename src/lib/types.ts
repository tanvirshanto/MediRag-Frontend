// ── Status ──
export type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
export type UserRole = "user" | "maintainer";

// ── Auth ──
export interface LoginRequest { username: string; password: string; }
export interface TokenResponse { access_token: string; token_type: string; }
export interface AuthUser { username: string; role: UserRole; }

// ── Users ──
export interface UserResponse { id: string; username: string; role: UserRole; is_active: boolean; created_at: string; }
export interface UserCreate { username: string; password: string; role: UserRole; }
export interface UserUpdate { role?: UserRole; is_active?: boolean; password?: string; }

// ── Uploads ──
export interface UploadJobResponse {
  id: string; filename: string; original_filename: string; uploaded_by: string | null;
  status: JobStatus; error_message: string | null;
  started_at: string | null; completed_at: string | null; created_at: string;
  total_pages: number | null; total_chunks: number | null;
}
export interface UploadBulkResponse { jobs: UploadJobResponse[]; }
export interface UploadListResponse { jobs: UploadJobResponse[]; total: number; }

// ── Client-side job ──
export interface IngestionJob {
  jobId: string; fileName: string; status: JobStatus;
  detail?: string | null; chunksIndexed?: number | null; createdAt: number;
  uploadedBy?: string | null; startedAt?: string | null; completedAt?: string | null;
}

// ── Streaming ──
export type StreamEvent =
  | { type: "start"; question: string }
  | { type: "token"; content: string }
  | { type: "done"; question: string }
  | { type: "error"; detail: string };

// ── Chat message ──
export interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string; streaming?: boolean; timestamp: number;
}

// ── Sidebar ──
export interface NavItem {
  label: string; href: string; icon: string; roles: UserRole[];
}

// ── Helpers ──
export const STATUS_COLORS: Record<JobStatus, string> = {
  QUEUED: "bg-slate-100 text-slate-600 border-slate-200",
  RUNNING: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

export const STATUS_DOT_COLORS: Record<JobStatus, string> = {
  QUEUED: "bg-slate-400", RUNNING: "bg-blue-500", COMPLETED: "bg-emerald-500", FAILED: "bg-red-500",
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Chat & Upload", href: "/chat", icon: "💬", roles: ["maintainer", "user"] },
  { label: "Upload Management", href: "/uploads", icon: "📋", roles: ["maintainer"] },
  { label: "Status Monitor", href: "/status", icon: "📊", roles: ["maintainer"] },
  { label: "Users", href: "/users", icon: "👥", roles: ["maintainer"] },
];

export function isTerminalStatus(s: JobStatus): boolean { return s === "COMPLETED" || s === "FAILED"; }
export function isActiveStatus(s: JobStatus): boolean { return !isTerminalStatus(s); }
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
