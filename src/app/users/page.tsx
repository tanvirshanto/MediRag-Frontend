"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { listUsers, createUser, updateUser, deleteUser } from "@/lib/api";
import { formatDate, type UserResponse, type UserRole } from "@/lib/types";

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!authLoading && user?.role !== "maintainer") { router.replace("/chat"); return; }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user?.role === "maintainer") void load(); }, [load, user]);

  const clearMessages = () => { setError(null); setSuccess(null); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;
    setCreating(true);
    clearMessages();
    try {
      await createUser({ username: newUsername.trim(), password: newPassword, role: newRole });
      setSuccess(`User "${newUsername.trim()}" created`);
      setShowCreate(false);
      setNewUsername(""); setNewPassword(""); setNewRole("user");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally { setCreating(false); }
  };

  const handleRoleToggle = async (userId: string, username: string, current: UserRole) => {
    const next: UserRole = current === "maintainer" ? "user" : "maintainer";
    clearMessages();
    try {
      await updateUser(userId, { role: next });
      setSuccess(`"${username}" role changed to ${next}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleToggleActive = async (userId: string, username: string, current: boolean) => {
    clearMessages();
    try {
      await updateUser(userId, { is_active: !current });
      setSuccess(`"${username}" ${current ? "deactivated" : "activated"}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Permanently delete "${username}"?`)) return;
    clearMessages();
    try {
      await deleteUser(userId);
      setSuccess(`"${username}" deleted`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (authLoading || !user) return <div className="flex h-screen items-center justify-center bg-[var(--bg)]"><Spinner /></div>;

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Users</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{users.length} registered users</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-[var(--accent-dim)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            + New User
          </button>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span className="font-bold">✓</span> {success}
            <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-500">✕</button>
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-bold">✕</span> {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-500">✕</button>
          </div>
        )}

        {/* Users table */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Status</th>
                  <th className="px-5 py-3 hidden md:table-cell">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((u) => (
                  <tr key={u.id} className="transition hover:bg-[var(--bg)]">
                    <td className="px-5 py-3">
                      <p className="font-medium">{u.username}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        u.role === "maintainer"
                          ? "border-purple-200 bg-purple-50 text-purple-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${
                        u.is_active ? "text-emerald-600" : "text-red-500"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                        {u.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-xs text-[var(--muted)]">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRoleToggle(u.id, u.username, u.role)}
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-[var(--bg)]"
                          title={u.role === "maintainer" ? "Demote to user" : "Promote to maintainer"}
                        >
                          {u.role === "maintainer" ? "↓" : "↑"}
                        </button>
                        <button
                          onClick={() => handleToggleActive(u.id, u.username, u.is_active)}
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-[var(--bg)]"
                          title={u.is_active ? "Deactivate" : "Activate"}
                        >
                          {u.is_active ? "⏸" : "▶"}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50"
                          title="Delete user"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="py-16 text-center text-sm text-[var(--muted)]">No users found.</div>
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create User">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent-dim)]"
              placeholder="newuser"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent-dim)]"
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none"
            >
              <option value="user">User</option>
              <option value="maintainer">Maintainer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating || !newUsername.trim() || !newPassword}
            className="w-full rounded-xl bg-[var(--accent-dim)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create User"}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
