"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { streamAsk, uploadSinglePdf, fetchUploadsList, retryJob } from "@/lib/api";
import { isActiveStatus, type ChatMessage, type IngestionJob } from "@/lib/types";

function ChatBubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  const isStreaming = m.streaming && !m.content;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
  <div className="max-w-[80%] flex flex-col">

    {/* Bubble */}
    <div
      className={`
        px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
        shadow-sm
        ${isUser
          ? "bg-blue-600 text-white rounded-2xl rounded-br-md"
          : "bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md border border-gray-200"
        }
      `}
    >
      {isStreaming && !isUser ? (
        <span className="flex items-center gap-2 text-gray-500">
          <Spinner size={14} /> Thinking…
        </span>
      ) : (
        <>
          {m.content || ""}
          {!isUser && m.streaming && m.content && (
            <span className="inline-block w-[0.5em] h-[1.1em] ml-0.5 align-text-bottom bg-gray-800 animate-pulse rounded-[1px]" />
          )}
        </>
      )}
    </div>

    {/* Timestamp */}
    <p
      className={`mt-1 text-[10px] text-gray-400 ${
        isUser ? "text-right" : "text-left"
      }`}
    >
      {m.timestamp && new Date(m.timestamp).toLocaleTimeString()}
    </p>

  </div>
</div>
  );
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isMaintainer = user?.role === "maintainer";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef("");
  const answerRef = useRef("");

  // Job state for maintainer
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<{ name: string; status: "pending" | "uploading" | "done" | "error"; error?: string }[]>([]);
  const uploading = uploadQueue.some((f) => f.status === "uploading");
  const MAX_FILE_SIZE = 32 * 1024 * 1024;

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const loadJobs = useCallback(() => {
    if (!isMaintainer) return;
    const fetch = async () => {
      setRefreshing(true);
      try {
        const res = await fetchUploadsList();
        setJobs(res.jobs.map((j) => ({
          jobId: j.id, fileName: j.original_filename, status: j.status,
          detail: j.error_message, chunksIndexed: j.total_chunks ?? undefined,
          createdAt: new Date(j.created_at).getTime(), uploadedBy: j.uploaded_by,
          startedAt: j.started_at, completedAt: j.completed_at,
        })));
      } catch {}
      finally { setRefreshing(false); }
    };
    void fetch();
  }, [isMaintainer]);

  // Load jobs for maintainer
  useEffect(() => {
    if (!isMaintainer) return;
    fetchUploadsList().then((res) => {
      setJobs(res.jobs.map((j) => ({
        jobId: j.id, fileName: j.original_filename, status: j.status,
        detail: j.error_message, chunksIndexed: j.total_chunks ?? undefined,
        createdAt: new Date(j.created_at).getTime(), uploadedBy: j.uploaded_by,
        startedAt: j.started_at, completedAt: j.completed_at,
      })));
    }).catch(() => {});
  }, [isMaintainer]);

  const handleRetry = useCallback(async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await retryJob(jobId);
      loadJobs();
    } catch {}
    finally { setRetryingId(null); }
  }, [loadJobs]);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    setError(null);
    setSending(true);

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: q, timestamp: Date.now() };
    const aid = crypto.randomUUID();
    const botMsg: ChatMessage = { id: aid, role: "assistant", content: "", streaming: true, timestamp: Date.now() };
    setMessages((p) => [...p, userMsg, botMsg]);
    setTimeout(scrollDown, 50);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    pendingRef.current = "";
    answerRef.current = "";

    let flushTimer: ReturnType<typeof setInterval> | null = setInterval(() => {
      if (pendingRef.current.length === 0) return;
      const chars = Math.min(pendingRef.current.length, 4);
      answerRef.current += pendingRef.current.slice(0, chars);
      pendingRef.current = pendingRef.current.slice(chars);
      setMessages((p) => p.map((m) => m.id === aid ? { ...m, content: answerRef.current } : m));
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }, 16);

    try {
      for await (const event of streamAsk(q, ac.signal)) {
        if (event.type === "token") {
          pendingRef.current += event.content;
        } else if (event.type === "error") throw new Error(event.detail);
      }
    } catch (e: unknown) {
      if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Request failed");
      setMessages((p) => p.filter((m) => m.id !== aid));
      setSending(false);
      abortRef.current = null;
      return;
    }

    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    answerRef.current += pendingRef.current;
    pendingRef.current = "";
    setMessages((p) => p.map((m) => m.id === aid ? { ...m, content: answerRef.current, streaming: false } : m));
    setSending(false);
    abortRef.current = null;
  }, [input, sending]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const pdfs = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) return;

    const oversized = pdfs.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setError(`File(s) exceed 32MB limit: ${oversized.map((f) => f.name).join(", ")}`);
      return;
    }

    const queue = pdfs.map((f) => ({ name: f.name, status: "pending" as const }));
    setUploadQueue((prev) => [...prev, ...queue]);

    for (const file of pdfs) {
      setUploadQueue((prev) =>
        prev.map((item) => item.name === file.name && item.status === "pending" ? { ...item, status: "uploading" as const } : item)
      );

      try {
        const res = await uploadSinglePdf(file);
        const newJob: IngestionJob = {
          jobId: res.id, fileName: res.original_filename, status: res.status,
          detail: res.error_message, chunksIndexed: res.total_chunks ?? undefined,
          createdAt: Date.now(),
        };
        setJobs((p) => [newJob, ...p]);
        setUploadQueue((prev) =>
          prev.map((item) => item.name === file.name && item.status === "uploading" ? { name: item.name, status: "done" as const } : item)
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadQueue((prev) =>
          prev.map((item) => item.name === file.name && item.status === "uploading" ? { name: item.name, status: "error" as const, error: msg } : item)
        );
      }
    }
  }, []);

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center bg-[var(--bg)]"><Spinner /></div>;
  }
  if (!user) return null;

  const activeCount = jobs.filter((j) => isActiveStatus(j.status)).length;

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Chat area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Chat header */}
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
            <p className="text-sm font-semibold">💬 Chat</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-3 text-4xl">🧬</div>
                <p className="text-lg font-semibold">Medical Knowledge Assistant</p>
                <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
                  Ask context-grounded questions using retrieved textbook knowledge.  
                  Answers are sourced from uploaded documents only.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2 text-sm text-gray-600">
                  {[
                    "What are CT findings in pneumonia?",
                    "Mechanism of beta blockers?",
                    "Side effects of metformin",
                    "Explain heart failure pathology"
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="p-2 border rounded-lg hover:bg-gray-50 transition text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((m) => <ChatBubble key={m.id} m={m} />)}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4">
            {error && (
              /not found|no relevant/i.test(error) ? (
                <div className="mb-3 border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm rounded-lg p-3">
                  ⚠️ No relevant information found in the indexed medical literature.
                  Try rephrasing or upload additional documents.
                </div>
              ) : (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )
            )}
            <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="border rounded-xl p-2 flex items-center gap-2 bg-white shadow-sm">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                placeholder="Ask a medical question from indexed textbooks..."
                disabled={sending}
                className="flex-1 text-sm outline-none px-2"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition hover:bg-blue-700 disabled:opacity-40 shrink-0"
              >
                {sending ? <Spinner size={16} /> : "Send"}
              </button>
            </form>
          </div>
        </div>

        {/* Right panel: Upload + Status (maintainer only) */}
        {isMaintainer && (
          <aside className="hidden w-80 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)] xl:flex">
            {/* Upload zone */}
            <div className="border-b border-[var(--border)] p-4">
              <h3 className="mb-3 text-sm font-semibold">📄 Upload PDFs</h3>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files); }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                  dragging ? "border-[var(--accent-dim)] bg-blue-50" : "border-[var(--border)] hover:border-[var(--accent-dim)] hover:bg-[var(--bg)]"
                } ${uploading ? "pointer-events-none opacity-50" : ""}`}
              >
                <span className="text-2xl">📤</span>
                <p className="mt-2 text-xs font-medium">
                  {uploading ? "Uploading…" : "Drop PDFs or click"}
                </p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">Multiple files supported (max 32MB each)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) void handleFiles(e.target.files); e.target.value = ""; }}
              />
              {uploadQueue.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {uploadQueue.map((f) => (
                    <div key={f.name} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                      {f.status === "uploading" ? (
                        <Spinner size={12} />
                      ) : f.status === "done" ? (
                        <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : f.status === "error" ? (
                        <svg className="h-3.5 w-3.5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`flex-1 truncate text-[11px] ${
                        f.status === "error" ? "text-red-600" : f.status === "done" ? "text-emerald-600" : "text-[var(--text)]"
                      }`}>
                        {f.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-[var(--muted)]">
                        {f.status === "pending" ? "Queued" : f.status === "uploading" ? "Uploading…" : f.status === "error" ? "Failed" : "Done"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active jobs */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">📊 Extraction Status</h3>
                <button
                  onClick={loadJobs}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1 rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--bg)] disabled:opacity-50"
                  title="Refresh"
                >
                  <svg className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
                {activeCount > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">{activeCount} active</span>
                )}
              </div>
              {jobs.filter((j) => j.status !== "COMPLETED").length === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--muted)]">No active uploads</p>
              ) : (
                <ul className="space-y-2">
                  {jobs.filter((j) => j.status !== "COMPLETED").map((j) => (
                    <li key={j.jobId} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{j.fileName}</p>
                          <p className="font-mono text-[10px] text-[var(--muted)]">{j.jobId.slice(0, 14)}…</p>
                        </div>
                        <StatusBadge status={j.status} />
                      </div>
                      {j.status === "COMPLETED" && j.chunksIndexed != null && (
                        <p className="mt-1 text-[11px] text-emerald-600">{j.chunksIndexed} chunks indexed</p>
                      )}
                      {j.detail && (
                        <p className={`mt-1 line-clamp-2 text-[10px] ${j.status === "COMPLETED" ? "text-emerald-600" : "text-red-600"}`}>{j.detail}</p>
                      )}
                      {j.status === "FAILED" && (
                        <button
                          onClick={() => handleRetry(j.jobId)}
                          disabled={retryingId === j.jobId}
                          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[var(--accent-dim)] px-2 py-1.5 text-[10px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                        >
                          {retryingId === j.jobId ? (
                            <>
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                              </svg>
                              Retrying…
                            </>
                          ) : (
                            "Retry"
                          )}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
      </div>
    </DashboardLayout>
  );
}
