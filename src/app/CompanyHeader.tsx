// Operating company name, shown bold at the top of the login page and dashboard.
export function CompanyHeader({ className }: { className?: string }) {
  return (
    <div className={`text-center ${className ?? ""}`}>
      <p className="font-serif text-lg font-bold tracking-wide text-wine sm:text-xl">
        Alzhagammaal Private Limited
      </p>
      <div className="mx-auto mt-1.5 h-px w-16 bg-gold-soft" />
    </div>
  );
}
