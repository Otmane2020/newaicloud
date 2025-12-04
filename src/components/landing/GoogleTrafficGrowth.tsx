import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/language";
import { Search, TrendingUp, Star } from "lucide-react";

// Google Logo Component
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export const GoogleTrafficGrowth = () => {
  const { language } = useTranslation();

  const dataPoints = [
    { month: 1, value: 200 },
    { month: 2, value: 800 },
    { month: 3, value: 2500 },
    { month: 4, value: 5000 },
    { month: 5, value: 8000 },
    { month: 6, value: 10000 },
  ];

  // Generate SVG path for the line chart
  const chartWidth = 320;
  const chartHeight = 160;
  const padding = 40;
  
  const maxValue = 10000;
  const points = dataPoints.map((d, i) => {
    const x = padding + (i * (chartWidth - padding * 2) / (dataPoints.length - 1));
    const y = chartHeight - padding - ((d.value / maxValue) * (chartHeight - padding * 2));
    return { x, y, value: d.value };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`;

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <GoogleLogo />
            <h2 className="text-xl sm:text-2xl font-bold">
              Google Search <span className="text-success">Traffic Growth</span>
            </h2>
          </div>

          {/* Chart Card */}
          <div className="bg-card rounded-3xl p-6 shadow-lg border border-border mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Search Console Impressions
              </span>
              <Badge className="bg-success/10 text-success border-success/20 text-xs">
                +500%
              </Badge>
            </div>

            {/* SVG Chart */}
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-40">
              {/* Grid lines */}
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="currentColor" strokeOpacity="0.1" />
              <line x1={padding} y1={chartHeight - padding - (chartHeight - padding * 2) * 0.5} x2={chartWidth - padding} y2={chartHeight - padding - (chartHeight - padding * 2) * 0.5} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
              <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
              
              {/* Y-axis labels */}
              <text x={padding - 8} y={chartHeight - padding + 4} className="text-[10px] fill-muted-foreground" textAnchor="end">200</text>
              <text x={padding - 8} y={chartHeight - padding - (chartHeight - padding * 2) * 0.1 + 4} className="text-[10px] fill-muted-foreground" textAnchor="end">1K</text>
              <text x={padding - 8} y={chartHeight - padding - (chartHeight - padding * 2) * 0.5 + 4} className="text-[10px] fill-muted-foreground" textAnchor="end">5K</text>
              <text x={padding - 8} y={padding + 4} className="text-[10px] fill-success font-semibold" textAnchor="end">10K</text>

              {/* Gradient area */}
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#areaGradient)" />
              
              {/* Line */}
              <path d={pathD} fill="none" stroke="hsl(var(--success))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Data points */}
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="5" fill="hsl(var(--success))" stroke="hsl(var(--card))" strokeWidth="2" />
              ))}

              {/* X-axis labels */}
              {dataPoints.map((d, i) => (
                <text key={i} x={points[i].x} y={chartHeight - 15} className="text-[9px] fill-muted-foreground" textAnchor="middle">
                  {language === 'fr' ? `Mois ${d.month}` : `Month ${d.month}`}
                </text>
              ))}
            </svg>
          </div>

          {/* Before/After Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-muted/50 rounded-2xl p-5 text-center border border-border">
              <p className="text-xs text-muted-foreground mb-2">
                {language === 'fr' ? "Avant NewAI" : "Before NewAI"}
              </p>
              <p className="text-3xl font-bold text-muted-foreground">~200</p>
              <p className="text-xs text-muted-foreground">{language === 'fr' ? "visites/mois" : "visits/month"}</p>
            </div>
            <div className="bg-success/10 rounded-2xl p-5 text-center border border-success/20">
              <p className="text-xs text-success mb-2">
                {language === 'fr' ? "Après 6 mois" : "After 6 months"}
              </p>
              <p className="text-3xl font-bold text-success">10K+</p>
              <p className="text-xs text-muted-foreground">{language === 'fr' ? "visites/mois" : "visits/month"}</p>
            </div>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-4 text-center border border-border hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium">Rich Snippets</p>
            </div>
            <div className="bg-card rounded-xl p-4 text-center border border-border hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium">SEO {language === 'fr' ? "Optimisé" : "Optimized"}</p>
            </div>
            <div className="bg-card rounded-xl p-4 text-center border border-border hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-warning/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-warning" />
              </div>
              <p className="text-xs font-medium">Top Rankings</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoogleTrafficGrowth;
