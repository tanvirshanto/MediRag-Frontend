import { STATUS_COLORS, type JobStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_COLORS[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "RUNNING" ? "animate-pulse" : ""}`} style={{ backgroundColor: "currentColor" }} />
      {status === "RUNNING" ? "Processing" : status}
    </span>
  );
}
