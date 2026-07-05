"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { StaffIcon } from "../icons";

export type StaffMember = {
  userId: string;
  name: string;
  email: string;
  role: "staff" | "admin";
};

export function StaffView({
  staff,
  currentUserId,
  isAdmin,
  setupNeeded,
}: {
  staff: StaffMember[];
  currentUserId: string;
  isAdmin: boolean;
  setupNeeded: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invite failed.");
      setSuccess(true);
      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {setupNeeded && (
        <div className="rounded-xl border border-gold-soft bg-gold-soft/20 px-4 py-3 text-sm text-ink">
          {t("staff", "setupNeeded")}
        </div>
      )}

      {isAdmin && (
        <form
          onSubmit={handleInvite}
          className="ledger-card flex flex-col gap-3 rounded-2xl p-6 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm text-ink-soft">
            {t("staff", "email")}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@email.com"
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("staff", "role")}
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "staff" | "admin")}
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine"
            >
              <option value="staff">{t("staff", "roleStaff")}</option>
              <option value="admin">{t("staff", "roleAdmin")}</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-wine px-5 py-2 text-sm font-medium text-onwine transition-colors hover:bg-wine-deep disabled:opacity-50"
          >
            {submitting ? t("staff", "inviting") : t("staff", "sendInvite")}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-wine-soft">{error}</p>}
      {success && <p className="text-sm text-wine">{t("staff", "inviteSuccess")}</p>}

      {staff.length === 0 ? (
        <div className="ledger-card rounded-2xl p-10 text-center text-ink-soft">
          {t("staff", "empty")}
        </div>
      ) : (
        <div className="ledger-card overflow-x-auto rounded-2xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gold-soft bg-ivory-deep text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">{t("staff", "name")}</th>
                <th className="px-4 py-3 font-medium">{t("staff", "email")}</th>
                <th className="px-4 py-3 font-medium">{t("staff", "role")}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((m) => (
                <tr key={m.userId} className="border-b border-gold-soft/60 last:border-0">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <StaffIcon className="h-4 w-4 text-gold" />
                      <span className="font-medium text-ink">{m.name || "—"}</span>
                      {m.userId === currentUserId && (
                        <span className="text-xs text-ink-soft">({t("staff", "you")})</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-soft">{m.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        m.role === "admin" ? "bg-wine text-onwine" : "bg-gold-soft/40 text-ink"
                      }`}
                    >
                      {t("staff", m.role === "admin" ? "roleAdmin" : "roleStaff")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
