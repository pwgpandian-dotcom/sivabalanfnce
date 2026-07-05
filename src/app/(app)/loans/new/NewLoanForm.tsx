"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { rupeesToPaise } from "@/lib/money";

type Customer = { id: string; name: string; phone: string | null };

export function NewLoanForm({
  shopId,
  suggestedLoanNumber,
}: {
  shopId: string;
  suggestedLoanNumber: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  const [pledgeItem, setPledgeItem] = useState("");
  const [pledgeWeight, setPledgeWeight] = useState("");
  const [principal, setPrincipal] = useState("");
  const [assessedValue, setAssessedValue] = useState("");
  const [rate, setRate] = useState("");
  const [loanDate, setLoanDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Loan number: by default auto (SF-<sequence>, server-assigned). Staff can
  // toggle manual entry to back-fill an old paper record's original number.
  const [manualMode, setManualMode] = useState(false);
  const [manualLoanNumber, setManualLoanNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleResults = !selectedCustomer && !creatingNew ? results : [];

  useEffect(() => {
    if (!query || selectedCustomer || creatingNew) return;
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, name, phone")
        .eq("shop_id", shopId)
        .ilike("name", `%${query}%`)
        .limit(8);
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, selectedCustomer, creatingNew, shopId, supabase]);

  async function resolveCustomerId(): Promise<string> {
    if (selectedCustomer) return selectedCustomer.id;

    const { data, error: insertError } = await supabase
      .from("customers")
      .insert({
        shop_id: shopId,
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
        address: newCustomerAddress.trim() || null,
      })
      .select("id")
      .single();

    if (insertError || !data) throw new Error(insertError?.message ?? "Could not create customer");
    return data.id;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedCustomer && !newCustomerName.trim()) {
      setError("Select an existing customer or enter a name for a new one.");
      return;
    }

    setSubmitting(true);
    try {
      const customerId = await resolveCustomerId();

      // Manual number => send it (server uses it as-is, keeps the sequence).
      // Auto (or manual left blank) => send null so the server assigns SF-<seq>.
      const loanNumberArg = manualMode && manualLoanNumber.trim() ? manualLoanNumber.trim() : null;

      const { data, error: rpcError } = await supabase.rpc("create_loan", {
        p_customer_id: customerId,
        p_principal_paise: rupeesToPaise(parseFloat(principal)),
        p_pledge_item_description: pledgeItem.trim(),
        p_pledge_weight_grams: pledgeWeight ? parseFloat(pledgeWeight) : null,
        p_loan_date: loanDate,
        p_initial_rate_percent: parseFloat(rate),
        p_loan_number: loanNumberArg,
        p_assessed_value_paise: assessedValue ? rupeesToPaise(parseFloat(assessedValue)) : null,
      });

      if (rpcError) {
        if (rpcError.code === "23505") {
          setError(t("newLoan", "loanNumberTaken"));
          return;
        }
        throw new Error(rpcError.message);
      }

      router.push(`/loans/${data}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ledger-card flex flex-col gap-5 rounded-2xl p-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold text-wine">{t("newLoan", "heading")}</h1>
        <div className="flex flex-col items-end gap-1">
          {manualMode ? (
            <input
              value={manualLoanNumber}
              onChange={(e) => setManualLoanNumber(e.target.value)}
              placeholder={suggestedLoanNumber}
              aria-label={t("newLoan", "loanNumber")}
              className="w-32 rounded-lg border border-gold-soft bg-ivory px-2 py-1 text-right font-mono text-gold outline-none focus:border-wine"
            />
          ) : (
            <span className="font-mono text-lg font-semibold text-gold">#{suggestedLoanNumber}</span>
          )}
          <button
            type="button"
            onClick={() => setManualMode((m) => !m)}
            className="text-xs text-wine hover:underline"
          >
            {manualMode ? t("newLoan", "autoNumber") : t("newLoan", "manualNumber")}
          </button>
          {manualMode && <span className="text-[10px] text-ink-soft">{t("newLoan", "manualHint")}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-ink-soft">{t("newLoan", "customer")}</label>
        {selectedCustomer ? (
          <div className="flex items-center justify-between rounded-lg border border-gold-soft bg-ivory-deep px-3 py-2">
            <span>{selectedCustomer.name}</span>
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="text-xs text-wine hover:underline"
            >
              {t("common", "cancel")}
            </button>
          </div>
        ) : creatingNew ? (
          <div className="flex flex-col gap-2 rounded-lg border border-gold-soft p-3">
            <input
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder={t("newLoan", "customerName")}
              required
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 outline-none focus:border-wine"
            />
            <input
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              placeholder={t("newLoan", "phone")}
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 outline-none focus:border-wine"
            />
            <input
              value={newCustomerAddress}
              onChange={(e) => setNewCustomerAddress(e.target.value)}
              placeholder={t("newLoan", "address")}
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 outline-none focus:border-wine"
            />
            <button
              type="button"
              onClick={() => setCreatingNew(false)}
              className="self-start text-xs text-wine hover:underline"
            >
              {t("common", "cancel")}
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("newLoan", "customerSearch")}
              className="w-full rounded-lg border border-gold-soft bg-ivory px-3 py-2 outline-none focus:border-wine"
            />
            {visibleResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gold-soft bg-ivory shadow-lg">
                {visibleResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setResults([]);
                      }}
                      className="block w-full px-3 py-2 text-left hover:bg-ivory-deep"
                    >
                      {c.name} {c.phone && <span className="text-ink-soft">({c.phone})</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setCreatingNew(true)}
              className="mt-1 text-xs text-wine hover:underline"
            >
              {t("newLoan", "newCustomer")}
            </button>
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        {t("newLoan", "pledgeItem")}
        <input
          value={pledgeItem}
          onChange={(e) => setPledgeItem(e.target.value)}
          required
          className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "pledgeWeight")}
          <input
            type="number"
            step="0.01"
            value={pledgeWeight}
            onChange={(e) => setPledgeWeight(e.target.value)}
            className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "loanDate")}
          <input
            type="date"
            value={loanDate}
            onChange={(e) => setLoanDate(e.target.value)}
            required
            className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "principal")}
          <input
            type="number"
            step="0.01"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            required
            className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "assessedValue")}
          <input
            type="number"
            step="0.01"
            value={assessedValue}
            onChange={(e) => setAssessedValue(e.target.value)}
            className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "rate")}
          <input
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
            className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine"
          />
        </label>
      </div>

      {error && <p className="text-sm text-wine-soft">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 self-start rounded-lg bg-wine px-5 py-2 font-medium text-onwine transition-colors hover:bg-wine-deep disabled:opacity-50"
      >
        {submitting ? t("common", "loading") : t("newLoan", "submit")}
      </button>
    </form>
  );
}
