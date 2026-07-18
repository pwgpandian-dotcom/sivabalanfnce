"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";
import { LoanActionsMenu } from "@/app/(app)/LoanActionsMenu";
import type { CustomerWithLoans } from "@/lib/customers";

export type CustomerLoanRow = {
  id: string;
  loan_number: string;
  principal_paise: number;
  loan_date: string;
  closed_date: string | null;
  status: "active" | "closed";
};

export function CustomerDetail({ customer }: { customer: CustomerWithLoans }) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [idProofType, setIdProofType] = useState(customer.id_proof_type ?? "");
  const [idNumber, setIdNumber] = useState(customer.id_number ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const activeCount = customer.loans.filter((l) => l.status === "active").length;
  const closedCount = customer.loans.filter((l) => l.status === "closed").length;

  const input = "rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    // Customer ID and created date are intentionally not editable.
    const { error: updErr } = await supabase
      .from("customers")
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        email: email.trim() || null,
        id_proof_type: idProofType.trim() || null,
        id_number: idNumber.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", customer.id);
    setSaving(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    setSaved(true);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/customers" className="text-sm text-wine hover:underline">
        ← {t("nav", "customers")}
      </Link>

      <div className="ledger-card rounded-2xl p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-wine">{customer.name}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {customer.phone ?? "—"}
              {customer.address && ` · ${customer.address}`}
            </p>
            {(customer.email || customer.id_number) && (
              <p className="mt-0.5 text-sm text-ink-soft">
                {customer.email}
                {customer.email && customer.id_number ? " · " : ""}
                {customer.id_number && `${customer.id_proof_type ? `${customer.id_proof_type}: ` : ""}${customer.id_number}`}
              </p>
            )}
            {customer.notes && <p className="mt-1 text-sm text-ink-soft">{customer.notes}</p>}
          </div>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setSaved(false); }}
              className="rounded-lg border border-wine px-3 py-1 text-sm text-wine transition-colors hover:bg-wine hover:text-onwine"
            >
              {t("customers", "edit")}
            </button>
          )}
        </div>

        <div className="mt-4 flex gap-6 text-sm">
          <span>
            <span className="font-mono font-semibold text-wine">{activeCount}</span>{" "}
            <span className="text-ink-soft">{t("customers", "active")}</span>
          </span>
          <span>
            <span className="font-mono font-semibold text-gold">{closedCount}</span>{" "}
            <span className="text-ink-soft">{t("customers", "closed")}</span>
          </span>
        </div>
        {saved && <p className="mt-3 text-sm text-wine">{t("customers", "saved")}</p>}

        {editing && (
          <form onSubmit={save} className="mt-5 flex flex-col gap-4 border-t border-gold-soft pt-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                {t("customers", "name")}
                <input value={name} onChange={(e) => setName(e.target.value)} required className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                {t("customers", "phone")}
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                {t("customers", "email")}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                {t("customers", "address")}
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                {t("customers", "idProof")}
                <input value={idProofType} onChange={(e) => setIdProofType(e.target.value)} placeholder="Aadhaar / PAN / Voter ID" className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                {t("customers", "idNumber")}
                <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={`${input} font-mono`} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("customers", "notes")}
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={input} />
            </label>

            {/* Read-only, non-editable identity fields */}
            <div className="grid grid-cols-1 gap-3 text-xs text-ink-soft sm:grid-cols-2">
              <div>
                <div className="uppercase tracking-wide">{t("customers", "customerId")}</div>
                <div className="font-mono">{customer.id}</div>
              </div>
              <div>
                <div className="uppercase tracking-wide">{t("customers", "createdDate")}</div>
                <div className="font-mono">{customer.created_at?.slice(0, 10)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="rounded-lg bg-wine px-5 py-2 text-sm font-medium text-onwine hover:bg-wine-deep disabled:opacity-50">
                {saving ? t("common", "loading") : t("common", "save")}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-sm text-ink-soft hover:underline">
                {t("common", "cancel")}
              </button>
              {error && <span className="text-sm text-wine-soft">{error}</span>}
            </div>
          </form>
        )}
      </div>

      <div className="ledger-card rounded-2xl p-6">
        <h2 className="mb-3 font-serif text-lg font-semibold text-wine">
          {t("customers", "loanHistory")}
        </h2>
        {customer.loans.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-soft">{t("customers", "noLoans")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gold-soft text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-3 py-2 font-medium">{t("dashboard", "loanNumber")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("loanDetail", "principalAmount")}</th>
                  <th className="px-3 py-2 font-medium">{t("loanList", "loanDate")}</th>
                  <th className="px-3 py-2 font-medium">{t("customers", "status")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("actions", "title")}</th>
                </tr>
              </thead>
              <tbody>
                {customer.loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-gold-soft/50 last:border-0">
                    <td className="px-3 py-2.5 font-mono">
                      <Link href={`/loans/${loan.id}`} className="hover:text-wine hover:underline">
                        {loan.loan_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatPaise(loan.principal_paise)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-ink-soft">{loan.loan_date}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          loan.status === "active" ? "bg-wine text-onwine" : "bg-ivory-deep text-ink-soft"
                        }`}
                      >
                        {t("loanStatus", loan.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <LoanActionsMenu loanId={loan.id} loanNumber={loan.loan_number} customerName={customer.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
