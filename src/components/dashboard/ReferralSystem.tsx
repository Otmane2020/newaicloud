import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Check, Gift, Users, Zap, Sparkles, X } from "lucide-react";

interface Referral {
  id: string;
  referral_code: string;
  referred_email: string | null;
  status: string;
  credits_earned: number;
  created_at: string;
}

export function ReferralSystem() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    // Get or create referral code
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("referral_code")
      .eq("referrer_id", user.id)
      .single();

    if (existingReferral) {
      setReferralCode(existingReferral.referral_code);
    } else {
      // Generate new code
      const { data: codeData } = await supabase.rpc("generate_referral_code", {
        user_id: user.id,
      });

      if (codeData) {
        // Create initial referral record
        await supabase.from("referrals").insert({
          referrer_id: user.id,
          referral_code: codeData,
        });
        setReferralCode(codeData);
      }
    }

    // Load referral stats
    const { data: referralData } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (referralData) {
      setReferrals(referralData);
      setTotalReferrals(referralData.filter((r) => r.status !== "pending").length);
      setCreditsEarned(referralData.reduce((sum, r) => sum + r.credits_earned, 0));
    }
  };

  const getReferralLink = () => {
    return `https://newai.sale/auth?ref=${referralCode}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getReferralLink());
    setCopied(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <>
      {/* Trigger Button/Card */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-2 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Gift className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Gagnez 100+ optimisations</h3>
                  <p className="text-sm text-muted-foreground">Parrainez vos amis et gagnez des optimisations gratuites</p>
                </div>
              </div>
              <Button variant="default" size="lg" className="group-hover:scale-105 transition-transform">
                Partager
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </DialogTrigger>

        <DialogContent className="sm:max-w-2xl">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <DialogHeader>
            <DialogTitle className="text-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Partagez et gagnez</h2>
                  <p className="text-sm text-muted-foreground font-normal">et gagnez des optimisations gratuites</p>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* How it works */}
            <div>
              <h3 className="font-semibold mb-4">Comment ça marche :</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">Partagez votre lien d'invitation</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">
                      Ils s'inscrivent et reçoivent <span className="text-green-600 font-bold">100 optimisations gratuites</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">
                      Vous recevez <span className="text-purple-600 font-bold">100 optimisations</span> une fois qu'ils publient leur premier site
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Link */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="font-semibold">Votre lien d'invitation :</label>
                <Badge variant="secondary">
                  utilisé par <span className="font-bold">{totalReferrals}</span> utilisateur{totalReferrals !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-4 py-3">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  <Input
                    readOnly
                    value={getReferralLink()}
                    className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 font-mono text-sm"
                  />
                </div>
                <Button onClick={handleCopy} size="lg" className="px-6">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copié!
                    </>
                  ) : (
                    "Copier le lien"
                  )}
                </Button>
              </div>
            </div>

            {/* Stats */}
            {totalReferrals > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Parrainages réussis</p>
                  <p className="text-2xl font-bold">{totalReferrals}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Optimisations gagnées</p>
                  <p className="text-2xl font-bold text-green-600">{creditsEarned}</p>
                </Card>
              </div>
            )}

            {/* Terms */}
            <p className="text-xs text-center text-muted-foreground">
              <a href="/terms" className="hover:underline">
                Voir les Conditions Générales
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
