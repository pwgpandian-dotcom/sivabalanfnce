// Simple copyright footer shown at the bottom of the app + login pages.
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="py-4 text-center text-xs text-ink-soft">
      © {year} Alzhagammaal Private Limited
    </footer>
  );
}
