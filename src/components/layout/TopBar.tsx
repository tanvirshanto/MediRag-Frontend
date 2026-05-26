"use client";

import { useAuth } from "@/context/AuthContext";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md px-4 lg:px-6">
      {/* Hamburger for mobile */}
      <button
        className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)] hover:bg-[var(--bg)] lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Breadcrumb area */}
      <div className="flex-1" />

      {/* User + Logout */}
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 sm:flex">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium">{user?.username}</span>
          <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">
            {user?.role}
          </span>
        </div>
        <button
          onClick={logout}
          className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-red-300 hover:text-red-600"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
