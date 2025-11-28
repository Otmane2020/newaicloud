import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/lib/language";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Search,
  Image,
  FileText,
  Tags
} from "lucide-react";

interface SeoMetric {
  label: string;
  before: number;
  after: number;
  icon: React.ReactNode;
}

export const DemoSeoComparison = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Simulated SEO scores - Before (poor) vs After (optimized with NewAI)
  const metrics: SeoMetric[] = [
    { 
      label: t.demo?.comparison?.metrics?.metaTitles || "Meta Titles", 
      before: 25, 
      after: 92,
      icon: <Search className="w-4 h-4" />
    },
    { 
      label: t.demo?.comparison?.metrics?.metaDescriptions || "Meta Descriptions", 
      before: 18, 
      after: 88,
      icon: <FileText className="w-4 h-4" />
    },
    { 
      label: t.demo?.comparison?.metrics?.altTexts || "Image ALT Texts", 
      before: 12, 
      after: 95,
      icon: <Image className="w-4 h-4" />
    },
    { 
      label: t.demo?.comparison?.metrics?.productTags || "Product Tags", 
      before: 35, 
      after: 89,
      icon: <Tags className="w-4 h-4" />
    },
  ];

  const globalScoreBefore = Math.round(metrics.reduce((acc, m) => acc + m.before, 0) / metrics.length);
  const globalScoreAfter = Math.round(metrics.reduce((acc, m) => acc + m.after, 0) / metrics.length);
  const improvement = globalScoreAfter - globalScoreBefore;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-success";
    if (score >= 50) return "bg-warning";
    return "bg-destructive";
  };

  const handleTryDemo = async () => {
    navigate('/demo');
  };

  return (
    <section className="container mx-auto px-4 py-16 sm:py-24">
      <div className="text-center mb-12 space-y-4">
        <Badge variant="outline" className="border-primary text-primary">
          <Sparkles className="w-4 h-4 mr-2" />
          {t.demo?.comparison?.badge || "See the Difference"}
        </Badge>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
          {t.demo?.comparison?.title || "Before & After NewAI"}
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {t.demo?.comparison?.subtitle || "See how NewAI transforms your Shopify store's SEO scores in minutes"}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Before Card */}
        <Card className="p-6 border-2 border-destructive/30 bg-destructive/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
            {t.demo?.comparison?.before || "Before"}
          </div>
          
          <div className="mt-6 space-y-6">
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(globalScoreBefore)}`}>
                {globalScoreBefore}%
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {t.demo?.comparison?.globalScore || "Global SEO Score"}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2 text-destructive">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">{t.demo?.comparison?.poorSeo || "Poor SEO"}</span>
              </div>
            </div>

            <div className="space-y-4">
              {metrics.map((metric, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {metric.icon}
                      <span>{metric.label}</span>
                    </div>
                    <span className={getScoreColor(metric.before)}>{metric.before}%</span>
                  </div>
                  <Progress 
                    value={metric.before} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="w-4 h-4 text-destructive" />
                {t.demo?.comparison?.issues?.missingMeta || "Missing meta descriptions"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="w-4 h-4 text-destructive" />
                {t.demo?.comparison?.issues?.noAlt || "No image ALT texts"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="w-4 h-4 text-destructive" />
                {t.demo?.comparison?.issues?.poorTags || "Poor product tagging"}
              </div>
            </div>
          </div>
        </Card>

        {/* After Card */}
        <Card className="p-6 border-2 border-success/30 bg-success/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-success text-success-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
            {t.demo?.comparison?.after || "After NewAI"}
          </div>
          
          <div className="mt-6 space-y-6">
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(globalScoreAfter)}`}>
                {globalScoreAfter}%
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {t.demo?.comparison?.globalScore || "Global SEO Score"}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2 text-success">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+{improvement}% {t.demo?.comparison?.improvement || "improvement"}</span>
              </div>
            </div>

            <div className="space-y-4">
              {metrics.map((metric, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {metric.icon}
                      <span>{metric.label}</span>
                    </div>
                    <span className={getScoreColor(metric.after)}>{metric.after}%</span>
                  </div>
                  <Progress 
                    value={metric.after} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                {t.demo?.comparison?.benefits?.optimizedMeta || "Optimized meta for all products"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                {t.demo?.comparison?.benefits?.aiAlt || "AI-generated ALT texts"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                {t.demo?.comparison?.benefits?.smartTags || "Smart product tags"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* CTA */}
      <div className="text-center mt-10">
        <Button 
          size="lg" 
          className="group bg-gradient-primary shadow-glow"
          onClick={handleTryDemo}
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {t.demo?.comparison?.cta || "Try the Demo"}
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
        <p className="text-sm text-muted-foreground mt-3">
          {t.demo?.comparison?.noCreditCard || "No credit card required • Instant access"}
        </p>
      </div>
    </section>
  );
};

export default DemoSeoComparison;
