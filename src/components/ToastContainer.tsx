"use client";

import { useToast } from "@/context/ToastContext";
import { useEffect, useState } from "react";

const iconMap = { success: "✓", error: "✕", info: "ℹ" };
const colorMap = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all animate-slide-up ${colorMap[t.type]}`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/15 text-xs font-bold">
            {iconMap[t.type]}
          </span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-2 text-current/50 hover:text-current">✕</button>
        </div>
      ))}
    </div>
  );
}
