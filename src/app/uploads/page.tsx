"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { fetchUploadsList, uploadSinglePdf, retryJob } from "@/lib/api";
import { formatDate, timeAgo, type UploadJobResponse } from "@/lib/types";

export default function UploadsPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [jobs, setJobs] = useState<UploadJobResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<{ name: string; status: "pending" | "uploading" | "done" | "error"; error?: string }[]>([]);
  const uploading = uploadQueue.some((f) => f.status === "uploading");
  const MAX_FILE_SIZE = 32 * 1024 * 1024;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!authLoading && user?.role !== "maintainer") { router.replace("/chat"); return; }
  }, [authLoading, user, router]);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetchUploadsList(statusFilter || undefined);
      setJobs(res.jobs);
      setTotal(res.total);
    } catch { /* toast handled elsewhere */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [statusFilter]);

  useEffect(() => { if (user?.role === "maintainer") void load(); }, [load, user]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const pdfs = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) return;

    const oversized = pdfs.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      addToast("error", `File(s) exceed 32MB limit: ${oversized.map((f) => f.name).join(", ")}`);
      return;
    }

    const queue = pdfs.map((f) => ({ name: f.name, status: "pending" as const }));
    setUploadQueue((prev) => [...prev, ...queue]);

    let errorCount = 0;

    for (let i = 0; i < pdfs.length; i++) {
      const file = pdfs[i];
      setUploadQueue((prev) =>
        prev.map((item) => item.name === file.name && item.status === "pending" ? { ...item, status: "uploading" as const } : item)
      );

      try {
        await uploadSinglePdf(file);
        setUploadQueue((prev) =>
          prev.map((item) => item.name === file.name && item.status === "uploading" ? { name: item.name, status: "done" as const } : item)
        );
      } catch (err) {
        errorCount++;
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadQueue((prev) =>
          prev.map((item) => item.name === file.name && item.status === "uploading" ? { name: item.name, status: "error" as const, error: msg } : item)
        );
      }
    }

    await load(false);
    setUploadQueue((prev) => prev.filter((f) => f.status === "error"));
    if (errorCount === 0) {
      addToast("success", "All uploads completed");
    }
  }, [load, addToast]);

  const handleRetry = useCallback(async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await retryJob(jobId);
      await load(false);
    } catch {
      /* toast handled elsewhere */
    } finally {
      setRetryingId(null);
    }
  }, [load]);

  if (authLoading || !user) return <div className="flex h-screen items-center justify-center bg-[var(--bg)]"><Spinner /></div>;

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Upload Management</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{total} total jobs</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => load(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--bg)] disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Refresh
            </button>
            {/* Filter */}
            <div className="flex gap-2">
            {["", "QUEUED", "RUNNING", "COMPLETED", "FAILED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === s
                    ? "border-[var(--accent-dim)] bg-[var(--accent-dim)] text-white"
                    : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--bg)]"
                }`}
              >
                {s || "All"}
              </button>
            ))}
            </div>
          </div>
        </div>

        {/* Upload zone */}
        <div className="mb-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="mb-4 text-sm font-semibold">📄 Upload PDFs</h3>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files); }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragging ? "border-[var(--accent-dim)] bg-blue-50" : "border-[var(--border)] hover:border-[var(--accent-dim)] hover:bg-[var(--bg)]"
              } ${uploading ? "pointer-events-none opacity-50" : ""}`}
            >
              <span className="text-3xl">📤</span>
              <p className="mt-3 text-sm font-medium">
                {uploading ? "Uploading…" : "Drop PDFs here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Multiple PDF files supported (max 32MB each)</p>
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
              <div className="mt-4 space-y-1.5">
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
                    <span className={`flex-1 truncate text-xs ${
                      f.status === "error" ? "text-red-600" : f.status === "done" ? "text-emerald-600" : "text-[var(--text)]"
                    }`}>
                      {f.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--muted)]">
                      {f.status === "pending" ? "Queued" : f.status === "uploading" ? "Uploading…" : f.status === "error" ? "Failed" : "Done"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Job table */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Uploaded by</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 hidden md:table-cell">Started</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Chunks</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {jobs.map((j) => (
                  <React.Fragment key={j.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}
                      className="cursor-pointer transition hover:bg-[var(--bg)]"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium truncate max-w-[200px]">{j.original_filename}</p>
                        <p className="font-mono text-[10px] text-[var(--muted)]">{j.id.slice(0, 14)}…</p>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-[var(--muted)]">{j.uploaded_by || "—"}</td>
                      <td className="px-5 py-3"><StatusBadge status={j.status} /></td>
                      <td className="px-5 py-3 hidden md:table-cell text-xs text-[var(--muted)]">{timeAgo(j.started_at)}</td>
                      <td className="px-5 py-3 hidden lg:table-cell font-mono text-xs">
                        {j.total_chunks != null ? <span className="text-emerald-600 font-semibold">{j.total_chunks}</span> : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-[var(--muted)]">
                        {expandedId === j.id ? "▲" : "▼"}
                      </td>
                    </tr>
                    {expandedId === j.id && (
                      <tr key={`${j.id}-detail`} className="bg-[var(--bg)]">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid gap-3 text-xs sm:grid-cols-3">
                            <div>
                              <p className="font-semibold uppercase tracking-wider text-[var(--muted)]">Created</p>
                              <p className="mt-0.5">{formatDate(j.created_at)}</p>
                            </div>
                            <div>
                              <p className="font-semibold uppercase tracking-wider text-[var(--muted)]">Completed</p>
                              <p className="mt-0.5">{formatDate(j.completed_at)}</p>
                            </div>
                            <div>
                              <p className="font-semibold uppercase tracking-wider text-[var(--muted)]">Pages</p>
                              <p className="mt-0.5">{j.total_pages ?? "—"}</p>
                            </div>
                            {j.error_message && (
                              <div className="sm:col-span-3">
                                <p className={`font-semibold uppercase tracking-wider ${j.status === "COMPLETED" ? "text-emerald-600" : "text-red-600"}`}>
                                  {j.status === "COMPLETED" ? "Remarks" : "Error"}
                                </p>
                                <p className={`mt-0.5 ${j.status === "COMPLETED" ? "text-emerald-600" : "text-red-600"}`}>{j.error_message}</p>
                              </div>
                            )}
                            {j.status === "FAILED" && (
                              <div className="sm:col-span-3 flex justify-end">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRetry(j.id); }}
                                  disabled={retryingId === j.id}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                                >
                                  {retryingId === j.id ? (
                                    <>
                                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                      </svg>
                                      Retrying…
                                    </>
                                  ) : (
                                    <>
                                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                      </svg>
                                      Retry
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {jobs.length === 0 && (
              <div className="py-16 text-center text-sm text-[var(--muted)]">No uploads found.</div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
