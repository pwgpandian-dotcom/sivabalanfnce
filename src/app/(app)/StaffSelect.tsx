"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type StaffOption = { user_id: string; name: string; email: string };

// Dropdown of shop staff (for Loan Issued By / Amount Received By). Reads via
// the list_shop_staff RPC. Value is the staff user_id (or "" for none).
export function StaffSelect({
  shopId,
  value,
  onChange,
  className,
}: {
  shopId: string;
  value: string;
  onChange: (userId: string) => void;
  className?: string;
}) {
  const { t } = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  useEffect(() => {
    supabase.rpc("list_shop_staff", { p_shop_id: shopId }).then(({ data }) => {
      if (Array.isArray(data)) {
        setStaff(
          data.map((s: { user_id: string; name: string; email: string }) => ({
            user_id: s.user_id,
            name: s.name,
            email: s.email,
          }))
        );
      }
    });
  }, [supabase, shopId]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ??
        "rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine"
      }
    >
      <option value="">{t("newLoan", "selectStaff")}</option>
      {staff.map((s) => (
        <option key={s.user_id} value={s.user_id}>
          {s.name || s.email}
        </option>
      ))}
    </select>
  );
}
