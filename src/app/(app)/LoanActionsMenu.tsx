"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Reusable ⋮ actions menu for a loan row: View / Edit / Delete. Delete opens a
 * confirmation dialog and, on confirm, permanently removes the loan (payments,
 * interest segments, rate history and re-pledges cascade via FK), frees its loan
 * number for reuse, and refreshes the table. Used across every loan listing.
 *
 * The dropdown is rendered with position:fixed anchored to the button so it is
 * never clipped by a table's horizontal scroll container.
 */
export function LoanActionsMenu({
  loanId,
  loanNumber,
  customerName,
  onDeleted,
}: {
  loanId: string;
  loanNumber: string;
  customerName: string;
  onDeleted?: () => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openMenu(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
    setOpen(true);
  }

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const { error: delErr } = await supabase.from("loans").delete().eq("id", loanId);
    setDeleting(false);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setConfirming(false);
    if (onDeleted) onDeleted();
    router.refresh();
  }

  const item = "block w-full px-4 py-2 text-left text-sm hover:bg-ivory-deep";

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        aria-label={t("actions", "menu")}
        aria-haspopup="menu"
        className="rounded-lg px-2 py-1 text-lg leading-none text-ink-soft hover:bg-ivory-deep hover:text-wine"
      >
        ⋮
      </button>

      {open && pos && (
        <>
          {/* Click-away overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            style={{ top: pos.top, right: pos.right }}
            className="ledger-card fixed z-50 w-40 overflow-hidden rounded-xl border border-gold-soft bg-ivory py-1 shadow-lg"
          >
            <button type="button" role="menuitem" className={item} onClick={() => go(`/loans/${loanId}`)}>
              👁 {t("actions", "view")}
            </button>
            <button type="button" role="menuitem" className={item} onClick={() => go(`/loans/${loanId}?edit=1`)}>
              ✏️ {t("actions", "edit")}
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${item} text-wine-soft`}
              onClick={() => {
                setOpen(false);
                setError(null);
                setConfirming(true);
              }}
            >
              🗑 {t("actions", "delete")}
            </button>
          </div>
        </>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !deleting && setConfirming(false)}>
          <div
            className="ledger-card w-full max-w-md rounded-2xl border-2 border-wine p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg font-semibold text-wine">{t("actions", "deleteTitle")}</h3>
            <div className="mt-3 rounded-xl border border-gold-soft bg-ivory-deep/40 p-3 text-sm">
              <div>
                <span className="text-ink-soft">{t("actions", "loanNo")}:</span>{" "}
                <span className="font-mono font-semibold text-wine">{loanNumber}</span>
              </div>
              <div>
                <span className="text-ink-soft">{t("actions", "customer")}:</span>{" "}
                <span className="font-medium">{customerName || "—"}</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-ink">{t("actions", "permanentWarn")}</p>
            <p className="mt-1 text-sm text-ink-soft">{t("actions", "downloadFirst")}</p>
            <p className="mt-1 text-sm text-ink-soft">{t("actions", "cascadeWarn")}</p>

            <a
              href={`/receipt/${loanId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-wine hover:underline"
            >
              ↓ {t("actions", "downloadReceipt")}
            </a>

            {error && <p className="mt-2 text-sm text-wine-soft">{error}</p>}

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-lg border border-gold-soft px-4 py-2 text-sm text-ink hover:bg-ivory-deep disabled:opacity-50"
              >
                {t("common", "cancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-wine px-4 py-2 text-sm font-medium text-onwine hover:bg-wine-deep disabled:opacity-50"
              >
                {deleting ? t("actions", "deleting") : t("actions", "delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
