"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise, rupeesToPaise, toDateInputValue } from "@/lib/money";
import { BrokerSelect } from "./BrokerSelect";

export type RePledge = {
  id: string;
  pawn_broker_id: string | null;
  larger_broker_name: string;
  larger_broker_receipt_number: string | null;
  external_tag_number: string | null;
  amount_received_paise: number | null;
  pledge_date: string;
  status: "active" | "redeemed";
  redeemed_date: string | null;
  notes: string | null;
  created_at: string;
};

export type RePledgeHistory = {
  id: string;
  re_pledge_id: string;
  action: "edit" | "redeem";
  changed_at: string;
  previous: Record<string, unknown>;
};

export type LoanInfo = {
  customerName: string;
  customerPhone: string | null;
  itemType: "gold" | "silver" | null;
  pledgeItem: string;
  weightGrams: number | null;
  principalPaise: number;
};

type FormState = {
  brokerId: string;
  pledgeDate: string;
  receipt: string;
  tag: string;
  amount: string;
  notes: string;
};

export function RePledgeSection({
  loanId,
  loanNumber,
  loanActive,
  shopId,
  loanInfo,
  rePledges,
  histories,
}: {
  loanId: string;
  loanNumber: string;
  loanActive: boolean;
  shopId: string;
  loanInfo: LoanInfo;
  rePledges: RePledge[];
  histories: RePledgeHistory[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const activeRP = rePledges.find((r) => r.status === "active") ?? null;
  const pastRPs = rePledges.filter((r) => r.status !== "active");

  const [mode, setMode] = useState<"none" | "create" | "edit">("none");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    brokerId: "",
    pledgeDate: toDateInputValue(new Date()),
    receipt: "",
    tag: "",
    amount: "",
    notes: "",
  });

  function openCreate() {
    setForm({ brokerId: "", pledgeDate: toDateInputValue(new Date()), receipt: "", tag: "", amount: "", notes: "" });
    setError(null);
    setMode("create");
  }

  function openEdit(rp: RePledge) {
    setForm({
      brokerId: rp.pawn_broker_id ?? "",
      pledgeDate: rp.pledge_date,
      receipt: rp.larger_broker_receipt_number ?? "",
      tag: rp.external_tag_number ?? "",
      amount: rp.amount_received_paise != null ? String(rp.amount_received_paise / 100) : "",
      notes: rp.notes ?? "",
    });
    setError(null);
    setMode("edit");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tag.trim()) {
      setError(t("rePledge", "tagRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    const amountPaise = form.amount ? rupeesToPaise(parseFloat(form.amount)) : null;
    const args = {
      p_pawn_broker_id: form.brokerId || null,
      p_receipt_number: form.receipt.trim() || null,
      p_tag_number: form.tag.trim(),
      p_amount_paise: amountPaise,
      p_pledge_date: form.pledgeDate,
      p_notes: form.notes.trim() || null,
    };
    const { error: rpcErr } =
      mode === "create"
        ? await supabase.rpc("create_re_pledge", { p_loan_id: loanId, ...args })
        : await supabase.rpc("edit_re_pledge", { p_id: activeRP!.id, ...args });
    setSubmitting(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    setMode("none");
    router.refresh();
  }

  async function redeem(rp: RePledge) {
    if (!window.confirm(t("rePledge", "redeemConfirm"))) return;
    const { error: rpcErr } = await supabase.rpc("redeem_re_pledge", {
      p_id: rp.id,
      p_redeemed_date: toDateInputValue(new Date()),
    });
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    router.refresh();
  }

  async function remove(rp: RePledge) {
    if (!window.confirm(t("rePledge", "deleteConfirm"))) return;
    const { error: rpcErr } = await supabase.rpc("delete_re_pledge", { p_id: rp.id });
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    if (mode === "edit") setMode("none");
    router.refresh();
  }

  return (
    <div className="ledger-card rounded-2xl p-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-wine">{t("rePledge", "title")}</h2>
        {loanActive && !activeRP && mode === "none" && (
          <button
            onClick={openCreate}
            className="rounded-lg bg-wine px-4 py-1.5 text-sm font-medium text-onwine transition-colors hover:bg-wine-deep"
          >
            {t("rePledge", "button")}
          </button>
        )}
      </div>

      {/* Active re-pledge card */}
      {activeRP && mode !== "edit" && (
        <RePledgeCard
          rp={activeRP}
          active
          onEdit={() => openEdit(activeRP)}
          onRedeem={() => redeem(activeRP)}
          onDelete={() => remove(activeRP)}
        />
      )}

      {/* Past (redeemed) re-pledges */}
      {pastRPs.map((rp) => (
        <div key={rp.id} className="mt-3">
          <RePledgeCard rp={rp} />
        </div>
      ))}

      {!activeRP && pastRPs.length === 0 && mode === "none" && (
        <p className="text-sm text-ink-soft">{t("rePledge", "empty")}</p>
      )}

      {/* Create / Edit form */}
      {mode !== "none" && (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 border-t border-gold-soft pt-4">
          {/* Read-only loan details */}
          <div className="rounded-xl border border-gold-soft bg-ivory-deep/40 p-3 text-sm">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
              {t("rePledge", "loanDetailsRO")}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              <RO label={t("dashboard", "loanNumber")} value={loanNumber} />
              <RO label={t("transactions", "customer")} value={loanInfo.customerName} />
              <RO label={t("newLoan", "phone")} value={loanInfo.customerPhone ?? "—"} />
              <RO label={t("newLoan", "itemType")} value={t("newLoan", loanInfo.itemType ?? "gold")} />
              <RO
                label={t("loanDetail", "pledgeDetails")}
                value={`${loanInfo.pledgeItem}${loanInfo.weightGrams != null ? ` — ${loanInfo.weightGrams}g` : ""}`}
              />
              <RO label={t("newLoan", "principal")} value={formatPaise(loanInfo.principalPaise)} />
            </div>
          </div>

          <p className="rounded-lg border border-gold-soft bg-gold-soft/20 px-3 py-2 text-sm text-ink">
            {t("rePledge", "refHint")} <span className="font-mono font-semibold text-wine">{loanNumber}</span>
          </p>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("rePledge", "externalBroker")}
            <BrokerSelect shopId={shopId} value={form.brokerId} onChange={(id) => setForm((f) => ({ ...f, brokerId: id }))} />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("rePledge", "pledgeDate")}
              <input type="date" value={form.pledgeDate} onChange={(e) => setForm((f) => ({ ...f, pledgeDate: e.target.value }))} required className={INPUT} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("rePledge", "receiptNumber")}
              <input value={form.receipt} onChange={(e) => setForm((f) => ({ ...f, receipt: e.target.value }))} className={`${INPUT} font-mono`} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("rePledge", "tagNumber")}
              <input value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} required className={`${INPUT} font-mono`} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("rePledge", "amountReceived")}
              <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={`${INPUT} font-mono`} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("rePledge", "notes")}
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={INPUT} />
          </label>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting} className="rounded-lg bg-wine px-4 py-2 text-sm font-medium text-onwine hover:bg-wine-deep disabled:opacity-50">
              {submitting ? t("common", "loading") : t("common", "save")}
            </button>
            <button type="button" onClick={() => setMode("none")} className="text-sm text-ink-soft hover:underline">
              {t("common", "cancel")}
            </button>
          </div>
          {error && <p className="text-sm text-wine-soft">{error}</p>}
        </form>
      )}

      {error && mode === "none" && <p className="mt-3 text-sm text-wine-soft">{error}</p>}

      {/* History timeline */}
      {(histories.length > 0 || rePledges.length > 0) && (
        <div className="mt-5 border-t border-gold-soft pt-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">{t("rePledge", "historyTitle")}</h3>
          <ol className="flex flex-col gap-2 border-l-2 border-gold-soft/60 pl-4 text-sm">
            {histories.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-wine" />
                <span className="font-medium text-wine">
                  {t("rePledge", h.action === "redeem" ? "actionRedeemed" : "actionEdited")}
                </span>{" "}
                <span className="text-ink-soft">{new Date(h.changed_at).toLocaleString()}</span>
              </li>
            ))}
            {rePledges.map((rp) => (
              <li key={`c-${rp.id}`} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-gold" />
                <span className="font-medium text-ink">{t("rePledge", "actionCreated")}</span>{" "}
                <span className="text-ink-soft">
                  {rp.larger_broker_name} · {new Date(rp.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const INPUT = "rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine";

function RO({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="text-ink">{value}</div>
    </div>
  );
}

function RePledgeCard({
  rp,
  active,
  onEdit,
  onRedeem,
  onDelete,
}: {
  rp: RePledge;
  active?: boolean;
  onEdit?: () => void;
  onRedeem?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="rounded-xl border border-gold-soft bg-ivory-deep/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium text-ink">
          {t("rePledge", "withBroker")} <span className="text-wine">{rp.larger_broker_name}</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            active ? "bg-wine text-onwine" : "bg-ivory-deep text-ink-soft"
          }`}
        >
          {t("pledgeStatus", active ? "rePledged" : "redeemed")}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm text-ink-soft sm:grid-cols-3">
        {rp.larger_broker_receipt_number && (
          <span>{t("rePledge", "receiptNumber")}: {rp.larger_broker_receipt_number}</span>
        )}
        {rp.external_tag_number && <span>{t("rePledge", "tagNumber")}: {rp.external_tag_number}</span>}
        {rp.amount_received_paise != null && (
          <span>{t("rePledge", "amountReceived")}: {formatPaise(rp.amount_received_paise)}</span>
        )}
        <span>{t("rePledge", "pledgeDate")}: {rp.pledge_date}</span>
        {rp.status === "redeemed" && rp.redeemed_date && (
          <span>{t("rePledge", "redeemedOn")}: {rp.redeemed_date}</span>
        )}
      </div>
      {rp.notes && <p className="mt-1 text-sm text-ink-soft">{rp.notes}</p>}
      {active && (
        <div className="mt-3 flex gap-2">
          <button onClick={onEdit} className="rounded-lg border border-wine px-3 py-1 text-xs text-wine transition-colors hover:bg-wine hover:text-onwine">
            {t("rePledge", "edit")}
          </button>
          <button onClick={onRedeem} className="rounded-lg bg-wine px-3 py-1 text-xs font-medium text-onwine hover:bg-wine-deep">
            {t("rePledge", "redeem")}
          </button>
          <button onClick={onDelete} className="rounded-lg border border-wine-soft px-3 py-1 text-xs text-wine-soft transition-colors hover:bg-wine-soft hover:text-onwine">
            {t("rePledge", "delete")}
          </button>
        </div>
      )}
    </div>
  );
}
