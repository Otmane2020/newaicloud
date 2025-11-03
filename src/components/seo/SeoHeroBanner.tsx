import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  CheckCircle, 
  Upload, 
  Loader2,
  LucideIcon
} from 'lucide-react';

interface SeoHeroBannerProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  globalScore: number;
  optimizing: boolean;
  onOptimizeAll: () => void;
  canOptimize: boolean;
  features?: Array<{ label: string; icon: LucideIcon }>;
  badge?: { text: string; variant?: 'default' | 'secondary' | 'outline' };
}

export function SeoHeroBanner({
  icon: Icon,
  title,
  subtitle,
  description,
  globalScore,
  optimizing,
  onOptimizeAll,
  canOptimize,
  features = [
    { label: 'SEO Automatisé', icon: Sparkles },
    { label: 'Contenu Complet', icon: CheckCircle },
    { label: 'Sync Shopify', icon: Upload }
  ],
  badge
}: SeoHeroBannerProps) {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 border-2 border-indigo-200 dark:border-indigo-800 p-8">
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 dark:text-indigo-100">
                  {title}
                </h2>
                {badge && (
                  <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {badge.text}
                  </Badge>
                )}
              </div>
              <p className="text-indigo-700 dark:text-indigo-300 text-sm">{subtitle}</p>
            </div>
          </div>
          <p className="text-indigo-800 dark:text-indigo-200 text-lg max-w-2xl leading-relaxed">
            {description}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white border border-white/20"
              >
                <feature.icon className="w-4 h-4" />
                <span className="font-medium text-sm">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 items-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="text-center">
            <div className={`text-5xl font-bold ${
              globalScore >= 80 ? 'text-green-500' : 
              globalScore >= 60 ? 'text-orange-500' : 
              'text-red-500'
            }`}>
              {globalScore}
            </div>
            <div className="text-white/80 text-sm font-medium">Score SEO Global</div>
            <Progress 
              value={globalScore} 
              className={`mt-2 h-2 ${
                globalScore >= 80 ? '[&>div]:bg-green-500' : 
                globalScore >= 60 ? '[&>div]:bg-orange-500' : 
                '[&>div]:bg-red-500'
              }`} 
            />
          </div>
          <Button
            size="lg"
            onClick={onOptimizeAll}
            disabled={optimizing || !canOptimize}
            className="bg-white text-purple-600 hover:bg-white/90 gap-2 shadow-xl font-semibold px-6 py-3 text-base"
          >
            {optimizing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Optimisation...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Optimiser Tout
                <Icon className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
