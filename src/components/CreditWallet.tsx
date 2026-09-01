import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, History, Loader2, Sparkles, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  amount_cents: number;
  currency: string;
  sort_order?: number;
};

type CreditTransaction = {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  created_at: string;
};

const FALLBACK_PACKAGES: CreditPackage[] = [
  { id: "credits_100", name: "100 crédits", credits: 100, amount_cents: 499, currency: "eur", sort_order: 10 },
  { id: "credits_300", name: "300 crédits", credits: 300, amount_cents: 999, currency: "eur", sort_order: 20 },
  { id: "credits_1000", name: "1 000 crédits", credits: 1000, amount_cents: 2499, currency: "eur", sort_order: 30 },
];

export function CreditWallet({ userId }: { userId: string }) {
  const { language } = useTranslation();
  const isFr = language === "fr";
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number>(50);
  const [packages, setPackages] = useState<CreditPackage[]>(FALLBACK_PACKAGES);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const loadBalance = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    if (!error && typeof data?.credits === "number") {
      setBalance(data.credits);
    }
  }, [userId]);

  const loadPackages = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("credit_packages")
      .select("id, name, credits, amount_cents, currency, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (!error && data?.length) setPackages(data);
  }, []);

  const loadTransactions = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("credit_transactions")
      .select("id, amount, balance_after, type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) setTransactions(data);
  }, [userId]);

  useEffect(() => {
    loadBalance();
    loadPackages();
  }, [loadBalance, loadPackages]);

  useEffect(() => {
    if (balance <= 0) {
      setOpen(true);
    }
  }, [balance]);

  useEffect(() => {
    if (open) loadTransactions();
  }, [open, loadTransactions]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("credit_payment");
    const sessionId = params.get("session_id");

    if (status === "cancelled") {
      toast.info(isFr ? "Recharge annulée. Aucun crédit débité." : "Top-up cancelled. No credits were charged.");
      params.delete("credit_payment");
      params.delete("session_id");
      window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
      return;
    }

    if (status !== "success" || !sessionId || verifying) return;

    const verify = async () => {
      setVerifying(true);
      try {
        const { data, error } = await supabase.functions.invoke("verify-credit-checkout", {
          body: { session_id: sessionId },
        });
        if (error) throw error;

        if (data?.paid) {
          if (typeof data.balance === "number") setBalance(data.balance);
          toast.success(
            isFr
              ? `Recharge confirmée : +${data.added} crédits.`
              : `Top-up confirmed: +${data.added} credits.`,
          );
        } else {
          toast.info(isFr ? "Paiement en cours de confirmation." : "Payment is still being confirmed.");
        }
      } catch (error) {
        console.error("Credit checkout verification failed", error);
        await loadBalance();
      } finally {
        params.delete("credit_payment");
        params.delete("session_id");
        window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
        setVerifying(false);
      }
    };

    verify();
  }, [isFr, loadBalance, verifying]);

  const level = useMemo(() => {
    if (balance <= 0) return "empty";
    if (balance <= 10) return "critical";
    if (balance <= 20) return "low";
    return "ok";
  }, [balance]);

  const guidance = useMemo(() => {
    if (level === "empty") {
      return isFr
        ? "Vos outils restent accessibles. Rechargez seulement pour lancer une nouvelle action IA payante."
        : "Your tools stay accessible. Top up only when you need another paid AI action.";
    }
    if (level === "critical") {
      return isFr
        ? "Solde faible : gardez vos crédits pour les générations qui ont le plus de valeur."
        : "Low balance: keep your credits for the generations that matter most.";
    }
    if (level === "low") {
      return isFr
        ? "Vous avez déjà utilisé une grande partie de votre crédit découverte."
        : "You have already used most of your discovery credits.";
    }
    return isFr
      ? "Utilisez vos crédits là où ils apportent le plus de valeur."
      : "Use your credits where they create the most value.";
  }, [isFr, level]);

  const startCheckout = async (creditPackage: CreditPackage) => {
    setCheckoutLoading(creditPackage.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-credit-checkout", {
        body: { package_id: creditPackage.id },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Stripe checkout URL missing");
      window.location.assign(data.url);
    } catch (error) {
      console.error("Unable to create credit checkout", error);
      toast.error(isFr ? "Impossible d'ouvrir le paiement Stripe." : "Unable to open Stripe checkout.");
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (pack: CreditPackage) =>
    new Intl.NumberFormat(isFr ? "fr-FR" : "en-US", {
      style: "currency",
      currency: (pack.currency || "eur").toUpperCase(),
    }).format(pack.amount_cents / 100);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-full border-violet-300/60 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 px-2.5 hover:from-violet-500/15 hover:to-fuchsia-500/15"
          aria-label={isFr ? "Voir mes crédits" : "View my credits"}
        >
          <Coins className="h-3.5 w-3.5 text-violet-600" />
          <span className="text-xs font-bold text-violet-700">{balance}</span>
          <span className="hidden text-xs text-slate-500 md:inline">{isFr ? "crédits" : "credits"}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
              <Zap className="h-5 w-5" />
            </div>
            <Badge variant="secondary">{balance} {isFr ? "crédits disponibles" : "credits available"}</Badge>
          </div>
          <DialogTitle>{isFr ? "Vos crédits IA" : "Your AI credits"}</DialogTitle>
          <DialogDescription>{guidance}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 text-sm text-slate-700">
          <div className="flex gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <div>
              <p className="font-semibold text-slate-900">
                {isFr ? "50 crédits sont offerts pour découvrir Nexora AI." : "50 credits are included to discover Nexora AI."}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {isFr
                  ? "Avant une action payante, vérifiez son coût. Privilégiez les actions qui améliorent réellement votre catalogue, vos contenus ou vos visuels."
                  : "Before a paid action, check its cost. Prioritize actions that materially improve your catalog, content or visuals."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {packages.map((pack) => {
            const recommended = pack.id === "credits_300";
            const label = pack.id === "credits_100"
              ? (isFr ? "Pour tester" : "For testing")
              : pack.id === "credits_300"
                ? (isFr ? "Usage régulier" : "Regular use")
                : (isFr ? "Usage intensif" : "Heavy use");

            return (
              <div
                key={pack.id}
                className={`relative rounded-xl border p-4 ${recommended ? "border-violet-400 bg-violet-50/60 shadow-sm" : "border-slate-200"}`}
              >
                {recommended && (
                  <Badge className="absolute -top-2.5 left-3 bg-violet-600">
                    {isFr ? "Recommandé" : "Recommended"}
                  </Badge>
                )}
                <p className="mt-1 text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{pack.credits}</p>
                <p className="text-xs text-slate-500">{isFr ? "crédits" : "credits"}</p>
                <p className="mt-3 text-lg font-semibold">{formatPrice(pack)}</p>
                <Button
                  className="mt-3 w-full"
                  variant={recommended ? "default" : "outline"}
                  disabled={checkoutLoading !== null}
                  onClick={() => startCheckout(pack)}
                >
                  {checkoutLoading === pack.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isFr ? "Recharger" : "Top up"}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-500">
          {isFr ? "Paiement unique sécurisé par Stripe. Aucun abonnement ajouté lors d'une recharge." : "Secure one-time payment by Stripe. A top-up does not add a subscription."}
        </p>

        {transactions.length > 0 && (
          <div className="border-t pt-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <History className="h-4 w-4" />
              {isFr ? "Derniers mouvements" : "Recent activity"}
            </div>
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium text-slate-800">
                      {transaction.type === "stripe_topup"
                        ? (isFr ? "Recharge Stripe" : "Stripe top-up")
                        : transaction.type}
                    </p>
                    <p className="text-slate-500">{new Date(transaction.created_at).toLocaleDateString(isFr ? "fr-FR" : "en-US")}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${transaction.amount > 0 ? "text-emerald-600" : "text-slate-800"}`}>
                      {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                    </p>
                    <p className="text-slate-500">{transaction.balance_after} {isFr ? "restants" : "left"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
