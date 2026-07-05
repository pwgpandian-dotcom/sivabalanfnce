"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LocaleToggle } from "@/lib/i18n/LocaleToggle";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { signOut } from "../login/actions";
import {
  DashboardIcon,
  NewLoanIcon,
  OldLoanIcon,
  ActiveLoansIcon,
  OverdueIcon,
  ClosedLoansIcon,
  CustomersIcon,
  RePledgeIcon,
  CalculatorIcon,
  ReportsIcon,
  StaffIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  SignOutIcon,
  MenuIcon,
  CloseIcon,
} from "./icons";
import type { dictionary } from "@/lib/i18n/dictionary";

type NavKey = keyof (typeof dictionary)["nav"];

type NavItem = {
  href: string;
  key: NavKey;
  Icon: (props: { className?: string }) => React.ReactElement;
};

function buildNavItems(migrationModeEnabled: boolean): NavItem[] {
  return [
    { href: "/", key: "dashboard", Icon: DashboardIcon },
    { href: "/loans/new", key: "newLoan", Icon: NewLoanIcon },
    // Old-loan back-fill is only offered while Migration Mode is on.
    ...(migrationModeEnabled
      ? [{ href: "/loans/old", key: "addOldLoan" as NavKey, Icon: OldLoanIcon }]
      : []),
    { href: "/loans/active", key: "activeLoans", Icon: ActiveLoansIcon },
    { href: "/loans/overdue", key: "overdue", Icon: OverdueIcon },
    { href: "/loans/closed", key: "closedLoans", Icon: ClosedLoansIcon },
    { href: "/customers", key: "customers", Icon: CustomersIcon },
    { href: "/re-pledges", key: "rePledges", Icon: RePledgeIcon },
    { href: "/calculator", key: "calculator", Icon: CalculatorIcon },
    { href: "/reports", key: "reports", Icon: ReportsIcon },
    { href: "/staff", key: "staff", Icon: StaffIcon },
    { href: "/settings", key: "settings", Icon: SettingsIcon },
  ];
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  shopName,
  migrationModeEnabled,
}: {
  shopName: string;
  migrationModeEnabled: boolean;
}) {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const appName = locale === "ta" ? "சிவபாலன் ஃபைனான்ஸ்" : "Sivabalan Finance";
  const navItems = buildNavItems(migrationModeEnabled);

  const closeMobile = () => setMobileOpen(false);

  const panel = (
    <div className="flex h-full flex-col bg-wine-deep text-onwine/85">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-gold/25 px-5 py-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gold-soft/40 bg-wine font-serif text-lg font-bold text-gold-bright">
          {(shopName || appName).charAt(0)}
        </span>
        <Link
          href="/"
          onClick={closeMobile}
          className="font-serif text-lg font-semibold leading-tight text-gold-soft"
        >
          {shopName || appName}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map(({ href, key, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={closeMobile}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "border-l-2 border-gold-bright bg-wine text-gold-bright"
                      : "border-l-2 border-transparent text-onwine/75 hover:bg-wine/60 hover:text-gold-soft"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      active ? "text-gold-bright" : "text-gold-soft/70 group-hover:text-gold-soft"
                    }`}
                  />
                  <span className="truncate">{t("nav", key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Controls */}
      <div className="flex flex-col gap-3 border-t border-gold/25 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-onwine/50">EN / தமிழ்</span>
          <LocaleToggle />
        </div>
        <ThemeButton />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-onwine/75 transition-colors hover:bg-wine/60 hover:text-gold-soft"
          >
            <SignOutIcon className="h-5 w-5 shrink-0 text-gold-soft/70" />
            {t("nav", "logout")}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gold-soft bg-wine-deep px-4 py-3 text-onwine md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={t("nav", "menu")}
          className="text-gold-soft"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <span className="font-serif text-base font-semibold text-gold-soft">
          {shopName || appName}
        </span>
        <span className="w-6" />
      </header>

      {/* Desktop fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-gold/25 md:block">
        {panel}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-wine-deep/60 backdrop-blur-sm"
            onClick={closeMobile}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <button
              type="button"
              onClick={closeMobile}
              aria-label={t("common", "cancel")}
              className="absolute right-3 top-4 z-10 text-onwine/70 hover:text-gold-soft"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

function ThemeButton() {
  const { t } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-onwine/75 transition-colors hover:bg-wine/60 hover:text-gold-soft"
    >
      {isDark ? (
        <SunIcon className="h-5 w-5 shrink-0 text-gold-soft/70" />
      ) : (
        <MoonIcon className="h-5 w-5 shrink-0 text-gold-soft/70" />
      )}
      {isDark ? t("nav", "lightMode") : t("nav", "darkMode")}
    </button>
  );
}
