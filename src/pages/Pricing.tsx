import { BadgeDollarSign, Sparkles } from "lucide-react";
import { SmartPricingAI } from "@/components/seo/SmartPricingAI";
import { Badge } from "@/components/ui/badge";

export default function Pricing() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-slate-950 via-violet-950 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Badge className="border border-white/15 bg-white/10 text-violet-100 hover:bg-white/10">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> CatalogueOptimize AI
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Smart pricing, grounded in your catalog
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Centralize costs, margins, competitor signals and Shopify price updates in the same product operations workspace.
            </p>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-violet-200">
            <BadgeDollarSign className="h-7 w-7" />
          </span>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
        <SmartPricingAI />
      </div>
    </div>
  );
}
