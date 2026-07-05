"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export type Broker = { id: string; name: string };

// Dropdown of the shop's external pawn brokers, with an inline "add broker".
export function BrokerSelect({
  shopId,
  value,
  onChange,
}: {
  shopId: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("pawn_brokers")
      .select("id, name")
      .eq("shop_id", shopId)
      .order("name")
      .then(({ data }) => {
        if (data) setBrokers(data);
      });
  }, [supabase, shopId]);

  const input = "rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine";

  async function addBroker() {
    if (!newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("pawn_brokers")
      .insert({ shop_id: shopId, name: newName.trim() })
      .select("id, name")
      .single();
    setSaving(false);
    if (!error && data) {
      setBrokers((b) => [...b, data].sort((a, z) => a.name.localeCompare(z.name)));
      onChange(data.id);
      setAdding(false);
      setNewName("");
    }
  }

  if (adding) {
    return (
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("rePledge", "brokerNamePh")}
          className={`${input} flex-1`}
        />
        <button
          type="button"
          onClick={addBroker}
          disabled={saving}
          className="rounded-lg bg-wine px-3 text-sm font-medium text-onwine hover:bg-wine-deep disabled:opacity-50"
        >
          {t("common", "save")}
        </button>
        <button type="button" onClick={() => setAdding(false)} className="text-sm text-ink-soft hover:underline">
          {t("common", "cancel")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
        <option value="">{t("rePledge", "selectBroker")}</option>
        {brokers.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => setAdding(true)} className="self-start text-xs text-wine hover:underline">
        {t("rePledge", "addBroker")}
      </button>
    </div>
  );
}
