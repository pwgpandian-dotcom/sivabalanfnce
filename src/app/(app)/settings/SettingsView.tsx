"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function SettingsView({
  shopId,
  migrationModeEnabled,
  nextLoanSequence,
  logoUrl,
}: {
  shopId: string;
  migrationModeEnabled: boolean;
  nextLoanSequence: number;
  logoUrl: string | null;
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
    <div className="flex flex-col gap-6">
      <div className="ledger-card flex flex-col gap-5 rounded-2xl p-8">
        <div>
          <h2 className="font-serif text-lg font-semibold text-wine">{t("settings", "migrationMode")}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">{t("settings", "migrationDesc")}</p>
        </div>

        {/* Toggle */}
        <label className="flex cursor-pointer items-center gap-3">
          <span className="relative inline-flex">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="peer sr-only" />
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

      <LogoCard shopId={shopId} logoUrl={logoUrl} supabase={supabase} onSaved={() => router.refresh()} />
      <PasswordCard supabase={supabase} />
    </div>
  );
}

function LogoCard({
  shopId,
  logoUrl,
  supabase,
  onSaved,
}: {
  shopId: string;
  logoUrl: string | null;
  supabase: ReturnType<typeof createClient>;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setError(null);
    setSaved(false);
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setError(t("settings", "logoTooLarge"));
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSaved(false);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${shopId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("shop-logos")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      const { data: pub } = supabase.storage.from("shop-logos").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${file.size}-${file.lastModified}`;
      const { error: rpcErr } = await supabase.rpc("set_shop_logo", { p_shop_id: shopId, p_logo_url: url });
      if (rpcErr) throw new Error(rpcErr.message);

      setPreview(url);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="ledger-card flex flex-col gap-4 rounded-2xl p-8">
      <div>
        <h2 className="font-serif text-lg font-semibold text-wine">{t("settings", "logoTitle")}</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">{t("settings", "logoDesc")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-gold-soft bg-ivory-deep/50">
          {preview ? (
            <Image src={preview} alt="logo" width={96} height={96} className="h-full w-full object-contain" unoptimized />
          ) : (
            <span className="px-2 text-center text-[10px] text-ink-soft">{t("settings", "noLogo")}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="text-sm text-ink-soft file:mr-3 file:rounded-lg file:border file:border-gold-soft file:bg-ivory-deep file:px-3 file:py-1 file:text-ink-soft"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={upload}
              disabled={!file || uploading}
              className="rounded-lg bg-wine px-4 py-2 text-sm font-medium text-onwine transition-colors hover:bg-wine-deep disabled:opacity-50"
            >
              {uploading ? t("settings", "uploading") : t("settings", "uploadLogo")}
            </button>
            {saved && <span className="text-sm text-wine">{t("settings", "logoSaved")}</span>}
            {error && <span className="text-sm text-wine-soft">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordCard({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const { t } = useLocale();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = "w-full rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (pw1.length < 6) {
      setError(t("settings", "passwordTooShort"));
      return;
    }
    if (pw1 !== pw2) {
      setError(t("settings", "passwordMismatch"));
      return;
    }
    setSaving(true);
    const { error: updErr } = await supabase.auth.updateUser({ password: pw1 });
    setSaving(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    setPw1("");
    setPw2("");
    setDone(true);
  }

  return (
    <div className="ledger-card flex flex-col gap-4 rounded-2xl p-8">
      <div>
        <h2 className="font-serif text-lg font-semibold text-wine">{t("settings", "passwordTitle")}</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">{t("settings", "passwordDesc")}</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 sm:max-w-md">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("settings", "newPassword")}
          <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("settings", "confirmPassword")}
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" className={input} />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-wine px-5 py-2 text-sm font-medium text-onwine transition-colors hover:bg-wine-deep disabled:opacity-50"
          >
            {saving ? t("common", "loading") : t("settings", "updatePassword")}
          </button>
          {done && <span className="text-sm text-wine">{t("settings", "passwordChanged")}</span>}
          {error && <span className="text-sm text-wine-soft">{error}</span>}
        </div>
      </form>
    </div>
  );
}
