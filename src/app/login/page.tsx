"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/chat");
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setBusy(true);
    try {
      await login({ username: username.trim(), password });
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-200 border-t-[var(--accent-dim)]" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── LEFT: Branding Panel ── */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 px-12 py-16 lg:flex">
        {/* Background floating patterns */}
        <div className="pointer-events-none absolute inset-0">
          {/* Medical crosses */}
          <svg className="absolute left-[10%] top-[15%] h-16 w-16 text-blue-100/60" viewBox="0 0 64 64" fill="currentColor">
            <rect x="28" y="8" width="8" height="48" rx="2" />
            <rect x="8" y="28" width="48" height="8" rx="2" />
          </svg>
          <svg className="absolute right-[15%] top-[10%] h-12 w-12 text-blue-100/50" viewBox="0 0 64 64" fill="currentColor">
            <rect x="28" y="8" width="8" height="48" rx="2" />
            <rect x="8" y="28" width="48" height="8" rx="2" />
          </svg>
          <svg className="absolute bottom-[20%] left-[30%] h-10 w-10 text-blue-100/40" viewBox="0 0 64 64" fill="currentColor">
            <rect x="28" y="8" width="8" height="48" rx="2" />
            <rect x="8" y="28" width="48" height="8" rx="2" />
          </svg>
          {/* Hexagon molecule */}
          <svg className="absolute right-[25%] top-[40%] h-24 w-24 text-blue-100/40" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="60,10 110,40 110,80 60,110 10,80 10,40" />
            <line x1="60" y1="10" x2="60" y2="40" />
            <line x1="110" y1="40" x2="90" y2="60" />
            <line x1="10" y1="40" x2="30" y2="60" />
            <circle cx="60" cy="10" r="4" fill="currentColor" />
            <circle cx="110" cy="40" r="4" fill="currentColor" />
            <circle cx="110" cy="80" r="4" fill="currentColor" />
            <circle cx="60" cy="110" r="4" fill="currentColor" />
            <circle cx="10" cy="80" r="4" fill="currentColor" />
            <circle cx="10" cy="40" r="4" fill="currentColor" />
          </svg>
          <svg className="absolute bottom-[30%] left-[15%] h-20 w-20 text-blue-100/35" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="60,10 110,40 110,80 60,110 10,80 10,40" />
            <circle cx="60" cy="10" r="4" fill="currentColor" />
            <circle cx="110" cy="40" r="4" fill="currentColor" />
            <circle cx="110" cy="80" r="4" fill="currentColor" />
            <circle cx="60" cy="110" r="4" fill="currentColor" />
            <circle cx="10" cy="80" r="4" fill="currentColor" />
            <circle cx="10" cy="40" r="4" fill="currentColor" />
          </svg>
          {/* Soft blue glow circles */}
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-blue-100/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-blue-100/20 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Logo: speech bubble with medical cross + brain nodes */}
          <svg className="mb-6 h-24 w-24" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bubbleGrad" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6" />
                <stop offset="1" stopColor="#2563EB" />
              </linearGradient>
            </defs>
            {/* Speech bubble rounded rect */}
            <rect x="8" y="8" width="80" height="65" rx="24" fill="url(#bubbleGrad)" />
            {/* Bubble tail */}
            <path d="M36 73 L48 58 L60 73 Z" fill="#2563EB" />
            {/* Medical cross */}
            <rect x="42" y="24" width="12" height="32" rx="2" fill="white" />
            <rect x="32" y="34" width="32" height="12" rx="2" fill="white" />
            {/* Brain nodes */}
            <circle cx="62" cy="26" r="3" fill="white" opacity="0.8" />
            <circle cx="70" cy="34" r="2.5" fill="white" opacity="0.7" />
            <circle cx="66" cy="44" r="3" fill="white" opacity="0.8" />
            <circle cx="60" cy="50" r="2" fill="white" opacity="0.6" />
            <circle cx="34" cy="28" r="2.5" fill="white" opacity="0.7" />
            <circle cx="28" cy="38" r="2" fill="white" opacity="0.6" />
            <line x1="62" y1="26" x2="70" y2="34" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="70" y1="34" x2="66" y2="44" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="66" y1="44" x2="60" y2="50" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="34" y1="28" x2="28" y2="38" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="42" y1="32" x2="34" y2="28" stroke="white" strokeWidth="1" opacity="0.5" />
          </svg>

          {/* Title */}
          <h1 className="text-4xl font-extrabold tracking-tight text-[#2563EB]">
            MediRAG AI
          </h1>
          <p className="mt-2 text-base font-medium text-gray-500">
            Medical Knowledge Assistant
          </p>

          {/* Tagline */}
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-500">
            Your intelligent companion for clinical information, evidence-based answers,
            and medical knowledge.
          </p>

          {/* 3D Medical Illustration */}
          <div className="mt-10">
            <svg viewBox="0 0 480 220" className="h-[220px] w-[480px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="surfaceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#EFF6FF" stopOpacity="0.6" />
                  <stop offset="1" stopColor="#DBEAFE" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#3B82F6" />
                  <stop offset="1" stopColor="#1D4ED8" />
                </linearGradient>
                <linearGradient id="book1Grad" x1="0" y1="0" x2="1" y2="0">
                  <stop stopColor="#2563EB" />
                  <stop offset="1" stopColor="#1E40AF" />
                </linearGradient>
              </defs>

              {/* Soft surface/table */}
              <ellipse cx="310" cy="200" rx="180" ry="30" fill="url(#surfaceGrad)" />

              {/* Plant pot & leaves */}
              <g transform="translate(400, 135)">
                <ellipse cx="20" cy="30" rx="14" ry="6" fill="#BFDBFE" opacity="0.5" />
                <rect x="12" y="8" width="16" height="22" rx="3" fill="#93C5FD" />
                <rect x="9" y="10" width="22" height="5" rx="2" fill="#BFDBFE" />
                <path d="M20 8 Q8 -8 5 -20" stroke="#22C55E" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M20 8 Q32 -8 35 -18" stroke="#16A34A" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M20 8 Q20 -2 20 -22" stroke="#22C55E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <ellipse cx="5" cy="-20" rx="6" ry="4" fill="#4ADE80" transform="rotate(-15, 5, -20)" />
                <ellipse cx="35" cy="-18" rx="5" ry="3.5" fill="#22C55E" transform="rotate(10, 35, -18)" />
                <ellipse cx="20" cy="-22" rx="5" ry="3.5" fill="#4ADE80" />
              </g>

              {/* Books stack */}
              <g transform="translate(280, 145)">
                {/* Book 3 (bottom) - DIAGNOSTICS */}
                <rect x="0" y="28" width="80" height="16" rx="3" fill="#1E40AF" />
                <rect x="2" y="30" width="76" height="12" rx="2" fill="#2563EB" />
                <text x="40" y="38" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="700" fill="white" letterSpacing="0.5">DIAGNOSTICS</text>

                {/* Book 2 - PHARMACOLOGY */}
                <rect x="0" y="14" width="75" height="16" rx="3" fill="#1D4ED8" />
                <rect x="2" y="16" width="71" height="12" rx="2" fill="#3B82F6" />
                <text x="37.5" y="24" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="700" fill="white" letterSpacing="0.5">PHARMACOLOGY</text>

                {/* Book 1 (top) - CLINICAL MEDICINE */}
                <rect x="0" y="0" width="70" height="16" rx="3" fill="#1E3A8A" />
                <rect x="2" y="2" width="66" height="12" rx="2" fill="#2563EB" />
                <text x="35" y="10" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="700" fill="white" letterSpacing="0.5">CLINICAL MEDICINE</text>
              </g>

              {/* Shield leaning on books */}
              <g transform="translate(335, 120)">
                <path d="M20 2 L38 8 L38 30 Q38 44 20 50 Q2 44 2 30 L2 8 Z" fill="url(#shieldGrad)" transform="rotate(8, 20, 25)" />
                <rect x="16" y="18" width="8" height="14" rx="1" fill="white" transform="rotate(8, 20, 25)" />
                <rect x="12" y="21" width="16" height="8" rx="1" fill="white" transform="rotate(8, 20, 25)" />
              </g>

              {/* Stethoscope */}
              <g transform="translate(140, 140)" stroke="#3B82F6" fill="none">
                <ellipse cx="22" cy="40" rx="15" ry="10" strokeWidth="3.5" />
                <path d="M22 40 L22 55 Q22 65 35 65 Q48 65 48 55 L48 30" strokeWidth="3" />
                <circle cx="48" cy="28" r="5" strokeWidth="3.5" fill="#2563EB" />
                <line x1="22" y1="35" x2="10" y2="10" strokeWidth="3.5" strokeLinecap="round" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Login Card ── */}
      <div className="flex w-full items-center justify-center bg-gradient-to-br from-blue-50/40 via-white to-sky-50/40 px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/40 animate-fade-in">
            {/* Header */}
            <div className="mb-7 flex flex-col items-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                <svg className="h-7 w-7 text-[#2563EB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="mt-1.5 text-sm text-gray-500">
                Sign in to continue to <span className="font-semibold text-[#2563EB]">MediRAG AI</span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Username
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg className="h-4.5 w-4.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 0a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM3.664 14.002C1.536 15.364 0 17.486 0 20h20c0-2.514-1.536-4.636-3.664-5.998A7.97 7.97 0 0 1 10 16a7.97 7.97 0 0 1-6.336-1.998z" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-[3px] focus:ring-blue-100"
                    placeholder="admin"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg className="h-4.5 w-4.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0 1 10 0v2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zm8-2v2H7V7a3 3 0 1 1 6 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-11 text-sm outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-[3px] focus:ring-blue-100"
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              {/* <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-sm font-medium text-[#2563EB] hover:underline">
                  Forgot password?
                </a>
              </div> */}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Sign In button */}
              <button
                type="submit"
                disabled={busy || !username.trim() || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {busy ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium text-gray-400">Secure access</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Security badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Your data is protected with enterprise-grade security
            </div>
          </div>

          {/* Mobile-only branding footer */}
          <div className="mt-8 text-center lg:hidden">
            <p className="text-sm font-semibold text-[#2563EB]">MediRAG AI</p>
            <p className="text-xs text-gray-400">Medical Knowledge Assistant</p>
          </div>
        </div>
      </div>
    </div>
  );
}
