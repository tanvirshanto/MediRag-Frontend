"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Pagination } from "@/components/ui/Pagination";
import { fetchUploadsList, retryJob } from "@/lib/api";
import { formatDate, timeAgo, isActiveStatus, type JobStatus, type UploadJobResponse } from "@/lib/types";

function JobProgressCard({ job, onRetry, retrying }: { job: UploadJobResponse; onRetry: (id: string) => void; retrying: string | null }) {
  return (
    <div className={`rounded-xl border p-4 transition-all hover:shadow-sm ${
      job.status === "RUNNING" ? "border-blue-200 bg-blue-50/30 ring-1 ring-blue-200" :
      job.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50/20" :
      job.status === "FAILED" ? "border-red-200 bg-red-50/20" :
      "border-[var(--border)] bg-[var(--surface)]"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {job.status === "RUNNING" && <Spinner size={14} />}
            <p className="font-semibold text-sm">{job.original_filename}</p>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{job.id.slice(0, 14)}…</p>
        </div>
        <StatusBadge status={job.status} />
      </div>
      {job.status !== "QUEUED" && job.status !== "COMPLETED" && job.status !== "FAILED" && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div className="h-full w-full animate-indeterminate rounded-full bg-[var(--accent-dim)]" />
          </div>
          <p className="mt-1 text-[10px] text-[var(--muted)]">Processing… started {timeAgo(job.started_at)}</p>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
        <div>
          <span className="font-semibold uppercase tracking-wider text-[10px]">Started</span>
          <p>{formatDate(job.started_at)}</p>
        </div>
        <div>
          <span className="font-semibold uppercase tracking-wider text-[10px]">Completed</span>
          <p>{formatDate(job.completed_at)}</p>
        </div>
        {job.total_chunks != null && (
          <div className="col-span-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Chunks Indexed</span>
            <p className="font-mono font-bold text-emerald-600">{job.total_chunks}</p>
          </div>
        )}
        {job.error_message && (
          <div className="col-span-2">
            <span className={`font-semibold uppercase tracking-wider text-[10px] ${job.status === "COMPLETED" ? "text-emerald-600" : "text-red-600"}`}>
              {job.status === "COMPLETED" ? "Remarks" : "Error"}
            </span>
            <p className={job.status === "COMPLETED" ? "text-emerald-600" : "text-red-600"}>{job.error_message}</p>
          </div>
        )}
        {job.status === "FAILED" && (
          <div className="col-span-2 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(job.id); }}
              disabled={retrying === job.id}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {retrying === job.id ? (
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
    </div>
  );
}

export default function StatusPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<UploadJobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [completedExpanded, setCompletedExpanded] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activePage, setActivePage] = useState(0);
  const [completedPage, setCompletedPage] = useState(0);
  const [activePageSize, setActivePageSize] = useState(12);
  const [completedPageSize, setCompletedPageSize] = useState(12);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!authLoading && user?.role !== "maintainer") { router.replace("/chat"); return; }
  }, [authLoading, user, router]);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetchUploadsList(statusFilter || undefined, 200, 0, search || undefined);
      setJobs(res.jobs);
    } catch { /* */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [statusFilter, search]);

  const handleFilterChange = useCallback((s: string) => {
    setStatusFilter(s);
    setActivePage(0);
    setCompletedPage(0);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRetry = useCallback(async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await retryJob(jobId);
      void load(false);
    } catch { /* */ }
    finally { setRetryingId(null); }
  }, [load]);

  const filterFn = useCallback((j: UploadJobResponse) => {
    if (search && !j.original_filename.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }, [search]);

  const allActiveJobs = jobs.filter((j) => isActiveStatus(j.status) && filterFn(j));
  const allCompletedJobs = jobs.filter((j) => !isActiveStatus(j.status) && filterFn(j));

  const activeSlice = allActiveJobs.slice(activePage * activePageSize, (activePage + 1) * activePageSize);
  const completedSlice = allCompletedJobs.slice(completedPage * completedPageSize, (completedPage + 1) * completedPageSize);

  if (authLoading || !user) return <div className="flex h-screen items-center justify-center bg-[var(--bg)]"><Spinner /></div>;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Status Monitor</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Ingestion tracking — click Refresh to update
            </p>
          </div>
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
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
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
                  setActivePage(0);
                  setCompletedPage(0);
                }, 300);
              }}
              placeholder="Search files…"
              className="rounded-xl border border-[var(--border)] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent-dim)] focus:ring-1 focus:ring-[var(--accent-dim)]"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); setActivePage(0); setCompletedPage(0); }}
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
                onClick={() => handleFilterChange(s)}
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

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <button
                onClick={() => setActiveExpanded((p) => !p)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[var(--bg)]"
              >
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Active Jobs</h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">{allActiveJobs.length}</span>
                </div>
                <svg className={`h-4 w-4 text-[var(--muted)] transition-transform ${activeExpanded ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {activeExpanded && (
                <div className="border-t border-[var(--border)] p-4">
                  {activeSlice.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <svg className="h-8 w-8 text-[var(--border)] mb-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-[var(--muted)]">No active ingestion jobs</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {activeSlice.map((j) => <JobProgressCard key={j.id} job={j} onRetry={handleRetry} retrying={retryingId} />)}
                      </div>
                      <Pagination
                        page={activePage}
                        pageSize={activePageSize}
                        total={allActiveJobs.length}
                        onPageChange={setActivePage}
                        onPageSizeChange={(s) => { setActivePageSize(s); setActivePage(0); }}
                      />
                    </>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <button
                onClick={() => setCompletedExpanded((p) => !p)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[var(--bg)]"
              >
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Recent History</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{allCompletedJobs.length}</span>
                </div>
                <svg className={`h-4 w-4 text-[var(--muted)] transition-transform ${completedExpanded ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {completedExpanded && (
                <div className="border-t border-[var(--border)] p-4">
                  {completedSlice.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <svg className="h-8 w-8 text-[var(--border)] mb-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-[var(--muted)]">No completed jobs yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {completedSlice.map((j) => <JobProgressCard key={j.id} job={j} onRetry={handleRetry} retrying={retryingId} />)}
                      </div>
                      <Pagination
                        page={completedPage}
                        pageSize={completedPageSize}
                        total={allCompletedJobs.length}
                        onPageChange={setCompletedPage}
                        onPageSizeChange={(s) => { setCompletedPageSize(s); setCompletedPage(0); }}
                      />
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
