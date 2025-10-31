import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Clock,
  Target,
  Zap,
  ListTodo,
  BarChart3,
  FileText,
  ArrowRight,
  Brain
} from "lucide-react";

interface SeoAuditAIProps {
  analysis: any;
  storeName: string;
}

export function SeoAuditAI({ analysis, storeName }: SeoAuditAIProps) {
  if (!analysis) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Haute':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
      case 'Moyenne':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
      case 'Basse':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Diagnostic Global */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Diagnostic SEO Global - {storeName}
          </CardTitle>
          <CardDescription>Analyse approfondie par Intelligence Artificielle</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-line">{analysis.diagnostic}</p>
        </CardContent>
      </Card>

      {/* Scores par catégorie */}
      <Card>
        <CardHeader>
          <CardTitle>Scores Détaillés par Catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(analysis.scores || {}).map(([key, data]: [string, any]) => (
              <Card key={key} className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg capitalize">{key}</CardTitle>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{data.score}</span>
                    <span className="text-muted-foreground">/100</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{data.justification}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
