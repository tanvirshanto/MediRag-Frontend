"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { NAV_ITEMS } from "@/lib/types";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || "user";

  const filtered = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform lg:static lg:z-0 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-dim)] text-white font-bold text-sm">
            MR
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">MediRAG AI</p>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest">Dashboard</p>
          </div>
          <button
            className="ml-auto rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--bg)] lg:hidden"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
            Navigation
          </p>
          <ul className="space-y-1">
            {filtered.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-[var(--accent-dim)] text-white shadow-sm"
                        : "text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom user info */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg)] text-xs font-bold text-[var(--muted)] uppercase">
              {user?.username?.charAt(0) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.username}</p>
              <p className="text-[11px] capitalize text-[var(--muted)]">{role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
