"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function SettingsView({
  shopId,
  migrationModeEnabled,
  nextLoanSequence,
}: {
  shopId: string;
  migrationModeEnabled: boolean;
  nextLoanSequence: number;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [enabled, setEnabled] = useState(migrationModeEnabled);
  const [nextAuto, setNextAuto] = useState(String(nextLoanSequence));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextAutoNum = parseInt(nextAuto, 10);
  const endingId = Number.isFinite(nextAutoNum) && nextAutoNum > 1 ? nextAutoNum - 1 : 0;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: rpcError } = await supabase.rpc("update_shop_settings", {
      p_shop_id: shopId,
      p_migration_mode_enabled: enabled,
      p_next_loan_sequence: Number.isFinite(nextAutoNum) ? nextAutoNum : nextLoanSequence,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="ledger-card flex flex-col gap-5 rounded-2xl p-8">
      <div>
        <h2 className="font-serif text-lg font-semibold text-wine">{t("settings", "migrationMode")}</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">{t("settings", "migrationDesc")}</p>
      </div>

      {/* Toggle */}
      <label className="flex cursor-pointer items-center gap-3">
        <span className="relative inline-flex">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="peer sr-only"
          />
          <span className="h-6 w-11 rounded-full bg-ink-soft/40 transition-colors peer-checked:bg-wine" />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ivory transition-transform peer-checked:translate-x-5" />
        </span>
        <span className="text-sm font-medium text-ink">{t("settings", "enableManual")}</span>
      </label>

      {/* IDs */}
      <div className="grid grid-cols-1 gap-4 border-t border-gold-soft pt-4 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-soft">{t("settings", "startingId")}</div>
          <div className="font-mono text-lg text-ink">1</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-soft">{t("settings", "endingId")}</div>
          <div className="font-mono text-lg text-ink">{endingId}</div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-ink-soft">{t("settings", "nextAutoId")}</span>
          <input
            type="number"
            min={1}
            value={nextAuto}
            onChange={(e) => setNextAuto(e.target.value)}
            className="w-full rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-wine px-5 py-2 text-sm font-medium text-onwine transition-colors hover:bg-wine-deep disabled:opacity-50"
        >
          {saving ? t("common", "loading") : t("common", "save")}
        </button>
        {saved && <span className="text-sm text-wine">{t("settings", "saved")}</span>}
        {error && <span className="text-sm text-wine-soft">{error}</span>}
      </div>
    </div>
  );
}
