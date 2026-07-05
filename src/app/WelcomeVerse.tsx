import { tamilSerif } from "./fonts";

// Traditional Tamil devotional welcome verse (invocation to Lord Murugan).
// Static Tamil text — shown as a gentle blessing above the login card and near
// the dashboard welcome banner.
const VERSE = [
  "ஆறுமுகம் படைத்த ஐயா வருக!",
  "நீறிடும் வேலவன் நித்தம் வருக!",
  "சிரகிரி வேலவன் சீக்கிரம் வருக!",
  "சரவண பவனார் சடுதியில் வருக!",
];

const VERSE_GOLD = "#C9A227";

/**
 * tone="gold"  → soft gold, lighter/smaller (dashboard, on the ivory surface).
 * tone="dark"  → bold, larger, dark wine (login, for stronger visibility).
 */
export function WelcomeVerse({
  className,
  tone = "gold",
}: {
  className?: string;
  tone?: "gold" | "dark";
}) {
  const isDark = tone === "dark";
  const lineClass = isDark
    ? "text-lg font-bold leading-8 tracking-wide text-wine sm:text-xl"
    : "text-sm font-normal leading-7 tracking-wide sm:text-[15px]";

  return (
    <div className={`${tamilSerif.className} text-center ${className ?? ""}`} lang="ta">
      {VERSE.map((line, i) => (
        <p key={i} className={lineClass} style={isDark ? undefined : { color: VERSE_GOLD }}>
          {line}
        </p>
      ))}
    </div>
  );
}
