import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface GoogleSearchConsoleSitemapsProps {
  selectedDomain: string;
}

export function GoogleSearchConsoleSitemaps({ selectedDomain }: GoogleSearchConsoleSitemapsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <FileText className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{t.searchConsole.sitemaps.title}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t.searchConsole.sitemaps.description}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
            <Card className="p-6 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-600" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">{t.searchConsole.sitemaps.indexed}</p>
              </div>
            </Card>
            
            <Card className="p-6 text-center">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 text-blue-600" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">{t.searchConsole.sitemaps.pending}</p>
              </div>
            </Card>
            
            <Card className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-orange-600" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">{t.searchConsole.sitemaps.errors}</p>
              </div>
            </Card>
          </div>

          <Card className="p-6 bg-accent/50">
            <h3 className="font-semibold mb-4">{t.searchConsole.sitemaps.submitSitemap}</h3>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t.searchConsole.sitemaps.placeholder}
              />
              <Button>{t.searchConsole.sitemaps.submitButton}</Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {t.searchConsole.sitemaps.submitSitemapDescription}
            </p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 mt-6">
            <Card className="p-4 bg-accent/50">
              <FileText className="h-6 w-6 mb-2 text-primary" />
              <h4 className="font-semibold mb-1">{t.searchConsole.sitemaps.productSitemap.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t.searchConsole.sitemaps.productSitemap.description}
              </p>
              <Button size="sm" variant="outline" disabled>{t.searchConsole.sitemaps.productSitemap.action}</Button>
            </Card>
            
            <Card className="p-4 bg-accent/50">
              <FileText className="h-6 w-6 mb-2 text-primary" />
              <h4 className="font-semibold mb-1">{t.searchConsole.sitemaps.pageSitemap.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t.searchConsole.sitemaps.pageSitemap.description}
              </p>
              <Button size="sm" variant="outline" disabled>{t.searchConsole.sitemaps.pageSitemap.action}</Button>
            </Card>
          </div>

          <div className="pt-6 text-center text-sm text-muted-foreground">
            <p>🚧 {t.searchConsole.sitemaps.underDevelopment}</p>
            <p>{t.searchConsole.sitemaps.underDevelopmentDesc}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
