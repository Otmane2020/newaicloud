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
  ArrowRight
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
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Diagnostic SEO Global - {storeName}
          </CardTitle>
          <CardDescription>Analyse approfondie par Intelligence Artificielle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {analysis.diagnostic}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scores Détaillés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Scores Détaillés par Catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(analysis.scores).map(([key, data]: [string, any]) => (
              <Card key={key} className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold capitalize">{key === 'homepage' ? 'Page d\'accueil' : key === 'products' ? 'Produits' : key === 'collections' ? 'Collections' : key === 'blog' ? 'Blog' : 'Technique'}</h3>
                    <div className="text-3xl font-bold text-primary">{data.score}/100</div>
                  </div>
                  <p className="text-sm text-muted-foreground">{data.justification}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Problèmes Critiques */}
      <Card className="border-l-4 border-l-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Problèmes Critiques à Corriger
          </CardTitle>
          <CardDescription>Ces problèmes impactent significativement votre référencement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.criticalIssues.map((issue: any, index: number) => (
              <div key={index} className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">{issue.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Impact: {issue.impact}
                      </Badge>
                      <Badge variant="destructive" className="gap-1">
                        Perte de trafic: {issue.estimatedTrafficLoss}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Wins */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-500" />
            Quick Wins - Actions Rapides à Fort Impact
          </CardTitle>
          <CardDescription>Gains rapides pour améliorer votre SEO immédiatement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.quickWins.map((win: any, index: number) => (
              <div key={index} className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">{win.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{win.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {win.estimatedTime}
                      </Badge>
                      <Badge className="gap-1 bg-green-500">
                        <Target className="h-3 w-3" />
                        {win.expectedGain}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan d'Action */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Plan d'Action Complet
          </CardTitle>
          <CardDescription>Actions priorisées pour optimiser votre SEO</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="Haute">Haute</TabsTrigger>
              <TabsTrigger value="Moyenne">Moyenne</TabsTrigger>
              <TabsTrigger value="Basse">Basse</TabsTrigger>
            </TabsList>
            
            {['all', 'Haute', 'Moyenne', 'Basse'].map(filter => (
              <TabsContent key={filter} value={filter} className="space-y-3 mt-4">
                {analysis.actionPlan
                  .filter((action: any) => filter === 'all' || action.priority === filter)
                  .map((action: any, index: number) => (
                    <div key={index} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{action.title}</h4>
                            <Badge className={getPriorityColor(action.priority)}>
                              {action.priority}
                            </Badge>
                            <Badge variant="outline">{action.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="secondary" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Impact: {action.estimatedImpact}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {action.effortHours}h estimées
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Prédictions */}
      <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Prédictions & Objectifs
          </CardTitle>
          <CardDescription>Résultats attendus si vous suivez ce plan d'action</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-background/50 border">
              <div className="text-sm text-muted-foreground mb-1">Trafic dans 3 mois</div>
              <div className="text-2xl font-bold text-primary">{analysis.predictions.trafficIn3Months}</div>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border">
              <div className="text-sm text-muted-foreground mb-1">ROI Estimé</div>
              <div className="text-2xl font-bold text-green-500">{analysis.predictions.estimatedROI}</div>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-background/50 border">
            <div className="text-sm font-semibold mb-2">Objectifs de Ranking</div>
            <div className="flex flex-wrap gap-2">
              {analysis.predictions.keywordGoals.map((keyword: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
