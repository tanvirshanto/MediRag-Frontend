"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Spinner } from "@/components/ui/Spinner";
import { fetchSystemLogs } from "@/lib/api";
import type { SystemLog } from "@/lib/types";

export default function SystemLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!authLoading && user?.role !== "maintainer") { router.replace("/chat"); return; }
  }, [authLoading, user, router]);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetchSystemLogs(limit, offset);
      setLogs(res);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    if (user?.role === "maintainer") void load();
  }, [user, load]);

  const rows = useMemo(() => logs, [logs]);

  if (authLoading || !user) return <div className="flex h-screen items-center justify-center bg-[var(--bg)]"><Spinner /></div>;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">System Logs</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Recent server logs — read-only</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }} className="rounded-xl border px-3 py-2 text-sm">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
            <button
              onClick={() => { setOffset(0); void load(false); }}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--bg)] disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/></svg>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <div className="rounded-xl border overflow-auto">
            <table className="w-full min-w-[800px] table-auto">
              <thead className="bg-[var(--surface-2)]">
                <tr>
                  <th className="text-left px-4 py-3 text-sm text-[var(--muted)]">Time</th>
                  <th className="text-left px-4 py-3 text-sm text-[var(--muted)]">Level</th>
                  <th className="text-left px-4 py-3 text-sm text-[var(--muted)]">Message</th>
                  <th className="text-left px-4 py-3 text-sm text-[var(--muted)]">Traceback</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--muted)]">No logs available</td></tr>
                ) : rows.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-4 py-3 align-top font-mono text-xs text-[var(--muted)]">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${l.level === 'ERROR' ? 'bg-red-50 text-red-700 border-red-200' : l.level === 'WARNING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{l.level}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="line-clamp-2 text-sm">{l.message}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-sm">
                      {l.traceback ? (
                        <div>
                          <button
                            onClick={() => setExpanded((s) => ({ ...s, [l.id]: !s[l.id] }))}
                            className="text-xs text-[var(--muted)] underline"
                          >
                            {expanded[l.id] ? 'Hide' : 'Show'}
                          </button>
                          {expanded[l.id] && (
                            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-red-700">{l.traceback}</pre>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
              <div className="text-sm text-[var(--muted)]">Showing {Math.min(limit, rows.length)} logs</div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setOffset(Math.max(0, offset - limit)); }} disabled={offset === 0} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50">Prev</button>
                <button onClick={() => { setOffset(offset + limit); }} disabled={rows.length < limit} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
