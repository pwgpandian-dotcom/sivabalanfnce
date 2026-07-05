import Image from "next/image";
import { LoginForm } from "./LoginForm";
import { WelcomeVerse } from "../WelcomeVerse";
import { CompanyHeader } from "../CompanyHeader";
import { Footer } from "../Footer";
import { tamilSerif } from "../fonts";

const BRAND_GOLD = "#C9A227";

/** Gradient scrim + brand title overlaid on the Murugan cover image. */
function BrandOverlay({ titleClass, subtitleClass }: { titleClass: string; subtitleClass: string }) {
  return (
    <>
      {/* Bottom scrim for WCAG-friendly contrast on the overlaid text. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
      {/* Lifted off the bottom edge and centered so the title + subtitle read clearly. */}
      <div className="absolute inset-x-0 bottom-0 px-6 pb-16 text-center sm:px-10 sm:pb-36">
        <h2
          className={`${tamilSerif.className} font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${titleClass}`}
          style={{ color: BRAND_GOLD }}
          lang="ta"
        >
          சிவபாலன் நகை அடகு கடை
        </h2>
        <p className={`mt-2 font-serif font-bold text-ivory drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] ${subtitleClass}`}>
          Sivabalan Finance
        </p>
        <p className="mt-1.5 font-sans text-xs font-semibold uppercase tracking-[0.22em] text-gold-soft drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] sm:text-sm">
          Smart Gold Loan Management
        </p>
      </div>
    </>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile: shorter image on top */}
      <div className="relative h-52 w-full shrink-0 md:hidden">
        <Image
          src="/branding/murugan-login.jpg"
          alt="Lord Murugan"
          fill
          priority
          sizes="100vw"
          className="object-cover object-top"
        />
        <BrandOverlay titleClass="text-2xl" subtitleClass="text-sm" />
      </div>

      {/* Desktop: full-height left cover image */}
      <div className="relative hidden md:block md:w-[55%] lg:w-[55%]">
        <Image
          src="/branding/murugan-login.jpg"
          alt="Lord Murugan"
          fill
          priority
          sizes="55vw"
          className="object-cover object-top"
        />
        <BrandOverlay titleClass="text-4xl lg:text-5xl" subtitleClass="text-lg" />
        {/* Soften the seam: fade the image's right edge into the page background
            so the image and the ivory form panel read as one cohesive design. */}
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-background" />
      </div>

      {/* Right: company name at top, then devotional verse + (unchanged) login form */}
      <div className="flex w-full flex-1 flex-col px-4 py-8">
        <CompanyHeader className="pt-2" />
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <WelcomeVerse className="max-w-md" tone="dark" />
          <LoginForm errorMessage={error} />
        </div>
        <Footer />
      </div>
    </div>
  );
}
