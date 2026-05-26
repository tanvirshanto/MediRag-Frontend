"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { fetchUploadsList, uploadPdfs, retryJob } from "@/lib/api";
import { formatDate, timeAgo, type UploadJobResponse } from "@/lib/types";

export default function UploadsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<UploadJobResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
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
    setUploadError(null);
    setUploading(true);
    try {
      const res = await uploadPdfs(pdfs);
      if (res.jobs.length > 0) await load(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [load]);

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
              <p className="mt-1 text-xs text-[var(--muted)]">Multiple PDF files supported</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) void handleFiles(e.target.files); e.target.value = ""; }}
            />
            {uploadError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span className="font-bold">✕</span> {uploadError}
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
                                <p className="font-semibold uppercase tracking-wider text-red-600">Error</p>
                                <p className="mt-0.5 text-red-600">{j.error_message}</p>
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
