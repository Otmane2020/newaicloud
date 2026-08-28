import { BadgeDollarSign } from "lucide-react";
import { SmartPricingAI } from "@/components/seo/SmartPricingAI";

export default function Pricing() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <BadgeDollarSign className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pricing operations</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Manage costs and margins first, compare market signals second, then review price recommendations before syncing.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
        <SmartPricingAI />
      </section>
    </div>
  );
}
