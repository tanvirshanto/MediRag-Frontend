"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Pagination } from "@/components/ui/Pagination";
import { fetchUploadsList, uploadSinglePdf, retryJob } from "@/lib/api";
import { formatDate, timeAgo, type UploadJobResponse } from "@/lib/types";

export default function UploadsPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [pageSize, setPageSize] = useState(15);
  const [jobs, setJobs] = useState<UploadJobResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<{ name: string; status: "pending" | "uploading" | "done" | "error"; error?: string }[]>([]);
  const uploading = uploadQueue.some((f) => f.status === "uploading");
  const MAX_FILE_SIZE = 32 * 1024 * 1024;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!authLoading && user?.role !== "maintainer") { router.replace("/chat"); return; }
  }, [authLoading, user, router]);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetchUploadsList(statusFilter || undefined, pageSize, page * pageSize, search || undefined);
      setJobs(res.jobs);
      setTotal(res.total);
    } catch { /* toast handled elsewhere */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [statusFilter, page, pageSize, search]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

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
          <div className="flex flex-wrap items-center gap-3">
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
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  searchTimerRef.current = setTimeout(() => {
                    setSearch(e.target.value);
                    setPage(0);
                  }, 300);
                }}
                placeholder="Search files…"
                className="rounded-xl border border-[var(--border)] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent-dim)] focus:ring-1 focus:ring-[var(--accent-dim)]"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex gap-2">
            {["", "QUEUED", "RUNNING", "COMPLETED", "FAILED"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(0); }}
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
            <h3 className="mb-4 text-sm font-semibold">Upload PDFs</h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files); }}
              disabled={uploading}
              className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragging ? "border-[var(--accent-dim)] bg-blue-50" : "border-[var(--border)] hover:border-[var(--accent-dim)] hover:bg-[var(--bg)]"
              } ${uploading ? "pointer-events-none opacity-50" : ""}`}
            >
              <svg className="h-8 w-8 text-[var(--muted)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <p className="mt-3 text-sm font-medium">
                {uploading ? "Uploading…" : "Drop PDFs here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Multiple PDF files supported (max 32MB each)</p>
            </button>
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
                <tr className="border-b border-[var(--border)] bg-[var(--bg)] text-left text-xs font-semibold text-[var(--muted)]">
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
                        <p className="font-medium truncate max-w-full">{j.original_filename}</p>
                        <p className="font-mono text-[10px] text-[var(--muted)]">{j.id}</p>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-[var(--muted)]">{j.uploaded_by || "—"}</td>
                      <td className="px-5 py-3"><StatusBadge status={j.status} /></td>
                      <td className="px-5 py-3 hidden md:table-cell text-xs text-[var(--muted)]">{timeAgo(j.started_at)}</td>
                      <td className="px-5 py-3 hidden lg:table-cell font-mono text-xs">
                        {j.total_chunks != null ? <span className="text-emerald-600 font-semibold">{j.total_chunks}</span> : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-[var(--muted)]">
                        <svg className={`h-4 w-4 inline-block transition-transform ${expandedId === j.id ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
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
              <div className="flex flex-col items-center py-16 text-center">
                <svg className="h-10 w-10 text-[var(--border)] mb-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-[var(--muted)]">No uploads found</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Upload PDFs to get started</p>
              </div>
            )}
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </DashboardLayout>
  );
}
