"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/chat");
    else router.replace("/login");
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
      <p className="text-sm text-[var(--muted)]">Loading…</p>
    </div>
  );
}
