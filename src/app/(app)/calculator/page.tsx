import { requireStaffSession } from "@/lib/auth/session";
import { NavHeading } from "../NavHeading";
import { CalculatorForm } from "./CalculatorForm";
import { CalculatorSubtitle } from "./CalculatorSubtitle";

export default async function CalculatorPage() {
  await requireStaffSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <NavHeading navKey="calculator" />
        <CalculatorSubtitle />
      </div>
      <CalculatorForm />
    </div>
  );
}
