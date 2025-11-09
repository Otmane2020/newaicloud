import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface HomepageAltGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HomepageAltGuide({ open, onOpenChange }: HomepageAltGuideProps) {
  const { t } = useTranslation();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="w-6 h-6" />
            {t.seo.homepage.altGuide.title}
          </DialogTitle>
          <DialogDescription>
            {t.seo.homepage.altGuide.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Pourquoi cette limitation */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{t.seo.homepage.altGuide.sections.limitation.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.seo.homepage.altGuide.sections.limitation.description}
                  </p>
                  <Alert>
                    <AlertDescription>
                      {t.seo.homepage.altGuide.sections.limitation.note}
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Exporter les ALT texts */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">{t.seo.homepage.altGuide.sections.export.title}</h3>
                  
                  <ol className="space-y-3 text-sm">
                    {t.seo.homepage.altGuide.sections.export.steps.map((step: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <Badge variant="outline" className="flex-shrink-0">{i + 1}</Badge>
                        <span dangerouslySetInnerHTML={{ __html: step }} />
                      </li>
                    ))}
                  </ol>

                  <div className="bg-muted p-4 rounded-lg text-xs font-mono">
                    <div className="grid grid-cols-4 gap-2 font-semibold mb-2">
                      {t.seo.homepage.altGuide.sections.export.csvHeaders.map((header: string) => (
                        <div key={header}>{header}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-muted-foreground">
                      {t.seo.homepage.altGuide.sections.export.csvExample.map((value: string) => (
                        <div key={value}>{value}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Modifier dans Shopify */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">{t.seo.homepage.altGuide.sections.modify.title}</h3>
                  
                  <div className="space-y-4">
                    {t.seo.homepage.altGuide.sections.modify.steps.map((step: any, i: number) => (
                      <div key={i}>
                        <Badge className="mb-2">{t.seo.homepage.altGuide.sections.modify.stepLabel} {i + 1}</Badge>
                        <p className="text-sm ml-2">
                          <strong>{step.title}</strong>
                        </p>
                        <ul className="text-sm text-muted-foreground ml-6 mt-1 space-y-1">
                          {step.instructions.map((instruction: string, j: number) => (
                            <li key={j} dangerouslySetInnerHTML={{ __html: instruction }} />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Bonnes pratiques */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">{t.seo.homepage.altGuide.sections.bestPractices.title}</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-medium text-green-700 dark:text-green-300">{t.seo.homepage.altGuide.sections.bestPractices.doTitle}</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {t.seo.homepage.altGuide.sections.bestPractices.doList.map((item: string) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-red-700 dark:text-red-300">{t.seo.homepage.altGuide.sections.bestPractices.dontTitle}</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {t.seo.homepage.altGuide.sections.bestPractices.dontList.map((item: string) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Re-scanner */}
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{t.seo.homepage.altGuide.sections.rescan.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t.seo.homepage.altGuide.sections.rescan.description }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
