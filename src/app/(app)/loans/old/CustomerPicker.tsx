"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Customer = { id: string; name: string; phone: string | null };

export type PickerValue =
  | { mode: "none" }
  | { mode: "selected"; customer: Customer }
  | { mode: "new"; name: string; phone: string; address: string };

/** Search/select an existing customer or capture a new one — same flow as New Loan. */
export function CustomerPicker({
  shopId,
  value,
  onChange,
}: {
  shopId: string;
  value: PickerValue;
  onChange: (v: PickerValue) => void;
}) {
  const { t } = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);

  const creatingNew = value.mode === "new";
  const selected = value.mode === "selected" ? value.customer : null;

  useEffect(() => {
    if (!query || selected || creatingNew) return;
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
  }, [query, selected, creatingNew, shopId, supabase]);

  const inputClass = "rounded-lg border border-gold-soft bg-ivory px-3 py-2 outline-none focus:border-wine";

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gold-soft bg-ivory-deep px-3 py-2">
        <span>{selected.name}</span>
        <button type="button" onClick={() => onChange({ mode: "none" })} className="text-xs text-wine hover:underline">
          {t("common", "cancel")}
        </button>
      </div>
    );
  }

  if (creatingNew) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-gold-soft p-3">
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder={t("newLoan", "customerName")}
          required
          className={inputClass}
        />
        <input
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder={t("newLoan", "phone")}
          className={inputClass}
        />
        <input
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder={t("newLoan", "address")}
          className={inputClass}
        />
        <button type="button" onClick={() => onChange({ mode: "none" })} className="self-start text-xs text-wine hover:underline">
          {t("common", "cancel")}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("newLoan", "customerSearch")}
        className={`w-full ${inputClass}`}
      />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gold-soft bg-ivory shadow-lg">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ mode: "selected", customer: c });
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
        onClick={() => onChange({ mode: "new", name: "", phone: "", address: "" })}
        className="mt-1 text-xs text-wine hover:underline"
      >
        {t("newLoan", "newCustomer")}
      </button>
    </div>
  );
}
