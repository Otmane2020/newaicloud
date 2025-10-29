import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Languages, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { 
  calculateCompletionRate, 
  detectMissingKeys, 
  exportTranslations,
  batchTranslate,
  getNestedValue,
  setNestedValue
} from '@/lib/translationManager';

// Import all locale files
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import es from '@/i18n/locales/es.json';
import de from '@/i18n/locales/de.json';
import it from '@/i18n/locales/it.json';
import pt from '@/i18n/locales/pt.json';
import nl from '@/i18n/locales/nl.json';
import ja from '@/i18n/locales/ja.json';
import zh from '@/i18n/locales/zh.json';
import ar from '@/i18n/locales/ar.json';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧', locale: en },
  { code: 'fr', name: 'Français', flag: '🇫🇷', locale: fr },
  { code: 'es', name: 'Español', flag: '🇪🇸', locale: es },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', locale: de },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', locale: it },
  { code: 'pt', name: 'Português', flag: '🇵🇹', locale: pt },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱', locale: nl },
  { code: 'ja', name: '日本語', flag: '🇯🇵', locale: ja },
  { code: 'zh', name: '中文', flag: '🇨🇳', locale: zh },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', locale: ar },
];

export const TranslationManager = () => {
  const [translating, setTranslating] = useState<string | null>(null);
  const { toast } = useToast();

  // Use English as reference locale
  const referenceLocale = en;

  const handleTranslateAll = async (targetLang: string) => {
    setTranslating(targetLang);
    try {
      const targetLocale = languages.find(l => l.code === targetLang)?.locale || {};
      const missingKeys = detectMissingKeys(referenceLocale, targetLocale);

      if (missingKeys.length === 0) {
        toast({
          title: "Already complete",
          description: `${targetLang.toUpperCase()} translations are already 100% complete.`,
        });
        setTranslating(null);
        return;
      }

      // Prepare translation batch (limit to 50 at a time for safety)
      const batchSize = 50;
      const totalBatches = Math.ceil(missingKeys.length / batchSize);
      let completedTranslations: Record<string, any> = { ...targetLocale };

      for (let i = 0; i < totalBatches; i++) {
        const batch = missingKeys.slice(i * batchSize, (i + 1) * batchSize);
        const keysToTranslate = batch.map(key => ({
          key,
          value: getNestedValue(referenceLocale, key)
        }));

        const translations = await batchTranslate(keysToTranslate, targetLang);

        // Merge translations into locale
        Object.entries(translations).forEach(([key, value]) => {
          setNestedValue(completedTranslations, key, value);
        });

        toast({
          title: `Batch ${i + 1}/${totalBatches} complete`,
          description: `Translated ${batch.length} keys for ${targetLang.toUpperCase()}`,
        });
      }

      // Export the completed translations
      exportTranslations(completedTranslations, `${targetLang}.json`);

      toast({
        title: "Translation complete!",
        description: `All missing keys translated for ${targetLang.toUpperCase()}. File downloaded.`,
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTranslating(null);
    }
  };

  const handleExport = (lang: string) => {
    const locale = languages.find(l => l.code === lang)?.locale;
    if (locale) {
      exportTranslations(locale, `${lang}.json`);
      toast({
        title: "Export successful",
        description: `${lang.toUpperCase()} translations downloaded`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Languages className="w-8 h-8" />
          Translation Manager
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage translations across all supported languages with AI-powered automation
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {languages.map((lang) => {
          const completionRate = calculateCompletionRate(referenceLocale, lang.locale);
          const missingCount = detectMissingKeys(referenceLocale, lang.locale).length;
          const isTranslating = translating === lang.code;

          return (
            <Card key={lang.code}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">{lang.flag}</span>
                    {lang.name}
                  </span>
                  {completionRate === 100 ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-warning" />
                  )}
                </CardTitle>
                <CardDescription>
                  {lang.code.toUpperCase()} - {completionRate}% complete
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Completion</span>
                    <span className="font-medium">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} />
                </div>

                {missingCount > 0 && (
                  <Badge variant="outline" className="w-full justify-center">
                    {missingCount} missing keys
                  </Badge>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleTranslateAll(lang.code)}
                    disabled={isTranslating || missingCount === 0}
                    className="flex-1"
                    size="sm"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages className="w-4 h-4 mr-2" />
                        Translate All
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleExport(lang.code)}
                    disabled={isTranslating}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1. Review completion:</strong> Check which languages need translation work
          </p>
          <p>
            <strong>2. Translate missing keys:</strong> Click "Translate All" to automatically translate missing keys using AI
          </p>
          <p>
            <strong>3. Download & replace:</strong> The translated JSON file will be downloaded. Replace the corresponding file in <code>src/i18n/locales/</code>
          </p>
          <p className="text-muted-foreground">
            Note: Always review AI translations for accuracy and cultural appropriateness before deploying to production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
