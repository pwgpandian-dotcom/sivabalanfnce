import Image from "next/image";
import { WelcomeVerse } from "../WelcomeVerse";

const BRAND_GOLD = "#C9A227";
const BRAND_WINE = "#6B1E2A";

/**
 * Dashboard devotional verse, paired with baby Krishna in a gold frame.
 * Mirrors the WelcomeBanner (Murugan on wine, image on the right) — here the
 * image sits on the LEFT so the two panels read as a matched, balanced set.
 */
export function WelcomeVerseCard() {
  return (
    <section className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-gold-soft/40 bg-gradient-to-l from-wine-deep via-wine to-wine-deep px-4 py-4 sm:gap-8 sm:px-8">
      {/* Framed portrait — gold border like a temple picture frame. */}
      <div
        className="relative h-32 w-[6.5rem] shrink-0 overflow-hidden rounded-xl border-2 shadow-lg sm:h-40 sm:w-32"
        style={{ borderColor: BRAND_GOLD }}
      >
        <Image
          src="/branding/krishna-dashboard.jpg"
          alt="Baby Krishna"
          fill
          sizes="128px"
          className="object-cover object-top"
        />
        {/* Nudge the bright blue toward the site's wine palette so it blends. */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: BRAND_WINE, opacity: 0.18, mixBlendMode: "color" }}
          aria-hidden
        />
      </div>

      {/* Verse — gold text reads cleanly on the wine panel. */}
      <WelcomeVerse className="min-w-0 flex-1" />
    </section>
  );
}
