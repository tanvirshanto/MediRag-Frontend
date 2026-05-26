"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { fetchUploadsList, retryJob } from "@/lib/api";
import { formatDate, timeAgo, isActiveStatus, type UploadJobResponse } from "@/lib/types";

function JobProgressCard({ job, onRetry, retrying }: { job: UploadJobResponse; onRetry: (id: string) => void; retrying: string | null }) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${
      job.status === "RUNNING" ? "border-blue-200 bg-blue-50/30 ring-1 ring-blue-200" :
      job.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50/20" :
      job.status === "FAILED" ? "border-red-200 bg-red-50/20" :
      "border-[var(--border)] bg-[var(--surface)]"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {job.status === "RUNNING" && <Spinner size={14} />}
            <p className="truncate font-semibold text-sm">{job.original_filename}</p>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{job.id.slice(0, 14)}…</p>
        </div>
        <StatusBadge status={job.status} />
      </div>
      {job.status === "RUNNING" && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div className="h-full w-2/3 animate-progress rounded-full bg-[var(--accent-dim)]" />
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
            <span className="font-semibold uppercase tracking-wider text-[10px] text-red-600">Error</span>
            <p className="text-red-600">{job.error_message}</p>
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

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!authLoading && user?.role !== "maintainer") { router.replace("/chat"); return; }
  }, [authLoading, user, router]);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetchUploadsList(undefined, 100);
      setJobs(res.jobs);
    } catch { /* */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { if (user?.role === "maintainer") void load(); }, [load, user]);

  const handleRetry = useCallback(async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await retryJob(jobId);
      await load(false);
    } catch { /* */ }
    finally { setRetryingId(null); }
  }, [load]);

  const activeJobs = jobs.filter((j) => isActiveStatus(j.status));
  const completedJobs = jobs.filter((j) => !isActiveStatus(j.status));

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

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-semibold">🟢 Active Jobs</h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">{activeJobs.length}</span>
              </div>
              {activeJobs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">
                  No active ingestion jobs
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeJobs.map((j) => <JobProgressCard key={j.id} job={j} onRetry={handleRetry} retrying={retryingId} />)}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-semibold">📋 Recent History</h2>
              {completedJobs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">
                  No completed jobs yet
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {completedJobs.slice(0, 30).map((j) => <JobProgressCard key={j.id} job={j} onRetry={handleRetry} retrying={retryingId} />)}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
