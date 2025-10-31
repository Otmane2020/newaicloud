import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Eye } from 'lucide-react';

interface VisionAIBannerProps {
  className?: string;
}

export function VisionAIBanner({ className = '' }: VisionAIBannerProps) {
  return (
    <Alert className={`bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 border-2 border-indigo-200 dark:border-indigo-800 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shrink-0 animate-pulse">
          <Eye className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-lg">
              <Sparkles className="w-3 h-3 mr-1" />
              Optimisé par Vision AI (Analyse d'images)
            </Badge>
          </div>
          <AlertDescription className="text-sm leading-relaxed">
            <span className="font-semibold">L'IA analyse vos images</span> pour générer automatiquement des descriptions SEO optimisées. 
            Détecte les <span className="font-medium">couleurs, matériaux, styles</span> et enrichit votre contenu pour maximiser votre visibilité sur Google.
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
