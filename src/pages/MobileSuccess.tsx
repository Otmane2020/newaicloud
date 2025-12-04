import { CheckCircle, Monitor, Mail, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const MobileSuccess = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Paiement réussi !
            </h1>
            <p className="text-gray-600">
              Votre abonnement est maintenant actif.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-800 font-semibold">
              <Monitor className="w-5 h-5" />
              <span>Prochaine étape</span>
            </div>
            <p className="text-sm text-blue-700 text-left">
              Connectez-vous sur <strong>ordinateur</strong> avec vos identifiants pour accéder à votre tableau de bord.
            </p>
          </div>

          {/* Credentials Reminder */}
          {user?.email && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-left">
              <p className="text-xs text-gray-500 uppercase font-medium">Vos identifiants</p>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="font-mono text-gray-700">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Mot de passe que vous avez choisi</span>
              </div>
            </div>
          )}

          {/* Desktop URL */}
          <div className="pt-2">
            <p className="text-sm text-gray-500">
              Rendez-vous sur
            </p>
            <p className="text-lg font-semibold text-primary">
              newai.sale
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileSuccess;
