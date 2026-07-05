"use client";

import Image from "next/image";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const BRAND_GOLD = "#C9A227";
const BRAND_WINE = "#6B1E2A";

export function WelcomeBanner({
  shopName,
  role,
}: {
  shopName: string;
  role: "staff" | "admin";
}) {
  const { t } = useLocale();
  const roleLabel = t("welcome", role === "admin" ? "admin" : "staff");

  return (
    <section className="relative flex h-48 items-stretch overflow-hidden rounded-2xl border border-gold-soft/40 bg-gradient-to-r from-wine-deep via-wine to-wine-deep sm:h-56">
      {/* Text on the left */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-6 sm:p-8">
        {shopName && (
          <p className="truncate text-xs font-medium uppercase tracking-[0.18em] text-gold-soft/80">
            {shopName}
          </p>
        )}
        <h1
          className="font-serif text-2xl font-bold leading-tight sm:text-3xl"
          style={{ color: BRAND_GOLD }}
        >
          {t("welcome", "greeting")}, {roleLabel}
        </h1>
        <p className="text-sm text-ivory/80">{t("welcome", "subtitle")}</p>
      </div>

      {/* Full image on the right — object-contain so the whole figure is visible. */}
      <div className="relative h-full w-40 shrink-0 sm:w-64">
        <Image
          src="/branding/murugan-dashboard-v2.jpg"
          alt="Lord Murugan"
          fill
          sizes="256px"
          className="object-contain object-bottom"
        />
        {/* Shift the bright orange toward the site's wine palette. */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: BRAND_WINE, opacity: 0.3, mixBlendMode: "color" }}
          aria-hidden
        />
        {/* Soft blend of the image's left edge into the wine panel. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-wine-deep to-transparent" />
      </div>
    </section>
  );
}
