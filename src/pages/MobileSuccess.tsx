import { CheckCircle, Monitor, Mail, Lock, Copy, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const MobileSuccess = () => {
  const { user } = useAuth();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const copyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      toast.success("Email copied!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-violet-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-violet-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-emerald-100/20 to-violet-100/20 rounded-full blur-3xl" />
      </div>

      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 50}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            >
              <Sparkles
                className={`w-4 h-4 ${i % 3 === 0 ? "text-emerald-400" : i % 3 === 1 ? "text-violet-400" : "text-amber-400"}`}
              />
            </div>
          ))}
        </div>
      )}

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm relative z-10">
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
          {/* Success Icon with animation */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 animate-pulse">
                <CheckCircle className="w-14 h-14 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-violet-400 to-violet-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Title - Bilingual */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-violet-600 bg-clip-text text-transparent">
              Payment Successful! 🎉
            </h1>
            <p className="text-gray-500 text-sm">Paiement réussi ! Votre abonnement est actif.</p>
          </div>

          {/* Plan Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-100 to-emerald-100 rounded-full">
            <span className="text-sm font-semibold text-violet-700">Pro Plan Active</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>

          {/* Instructions Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 space-y-3 border border-blue-100">
            <div className="flex items-center gap-2 text-blue-800 font-semibold">
              <Monitor className="w-5 h-5" />
              <span>Next Step / Prochaine étape</span>
            </div>
            <p className="text-sm text-blue-700 text-left leading-relaxed">
              🇬🇧 Log in on a <strong>computer</strong> to access your dashboard.
            </p>
          </div>

          {/* Credentials */}
          {user?.email && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-left border border-gray-100">
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">
                Your credentials / Vos identifiants
              </p>

              <div className="flex items-center justify-between gap-2 bg-white rounded-lg p-3 border">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  <span className="font-mono text-sm text-gray-700 truncate">{user.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyEmail}
                  className="flex-shrink-0 h-8 px-2 hover:bg-violet-50"
                >
                  <Copy className="w-4 h-4 text-violet-500" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm bg-white rounded-lg p-3 border">
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Password you created / Mot de passe choisi</span>
              </div>
            </div>
          )}

          {/* Website URL */}
          <div className="pt-2 space-y-2">
            <p className="text-sm text-gray-400">Go to / Rendez-vous sur</p>
            <a
              href="https://newai.sale"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              newai.sale
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Help text */}
          <p className="text-xs text-gray-400 pt-2">Need help? Contact us at support@newai.sale</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileSuccess;
