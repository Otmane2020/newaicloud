import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, CheckCircle2, XCircle, Download, Upload, RefreshCw } from 'lucide-react';
import translationEN from '@/i18n/locales/en.json';
import { batchTranslate, detectMissingKeys, getNestedValue } from '@/lib/translationManager';

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

export const TranslationManagerDB = () => {
  const { t, changeLanguage } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLang, setSelectedLang] = useState('fr');
  const [translations, setTranslations] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, { total: number; reviewed: number }>>({});

  // Load translations from database
  const loadTranslations = async (lang: string) => {
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('language', lang)
        .order('key');

      if (error) throw error;
      setTranslations(data || []);
    } catch (error) {
      console.error('Error loading translations:', error);
      toast({
        title: "Error",
        description: "Failed to load translations from database",
        variant: "destructive"
      });
    }
  };

  // Load stats for all languages
  const loadStats = async () => {
    try {
      const statsPromises = languages.map(async (lang) => {
        const { data, error } = await supabase
          .from('translations')
          .select('reviewed')
          .eq('language', lang.code);

        if (error) throw error;

        return {
          code: lang.code,
          total: data.length,
          reviewed: data.filter(t => t.reviewed).length
        };
      });

      const results = await Promise.all(statsPromises);
      const statsMap = results.reduce((acc, stat) => {
        acc[stat.code] = { total: stat.total, reviewed: stat.reviewed };
        return acc;
      }, {} as Record<string, { total: number; reviewed: number }>);

      setStats(statsMap);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadTranslations(selectedLang);
    loadStats();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('translations-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'translations'
      }, () => {
        loadTranslations(selectedLang);
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLang]);

  // Translate missing keys
  const handleTranslateAll = async (targetLang: string) => {
    setLoading(true);
    try {
      // Get all EN keys
      const flattenKeys = (obj: Record<string, any>, prefix = ''): string[] => {
        let keys: string[] = [];
        Object.keys(obj).forEach(key => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            keys = keys.concat(flattenKeys(obj[key], fullKey));
          } else {
            keys.push(fullKey);
          }
        });
        return keys;
      };

      const allKeys = flattenKeys(translationEN);

      // Get existing translations
      const { data: existing } = await supabase
        .from('translations')
        .select('key')
        .eq('language', targetLang);

      const existingKeys = new Set(existing?.map(t => t.key) || []);
      const missingKeys = allKeys.filter(key => !existingKeys.has(key));

      if (missingKeys.length === 0) {
        toast({
          title: "Already complete",
          description: `All translations for ${targetLang} are up to date`,
        });
        setLoading(false);
        return;
      }

      // Translate in batches
      const keysToTranslate = missingKeys.map(key => ({
        key,
        value: String(getNestedValue(translationEN, key))
      }));

      await batchTranslate(keysToTranslate, targetLang);

      toast({
        title: "Success",
        description: `Translated ${missingKeys.length} keys to ${targetLang}`,
      });

      loadTranslations(selectedLang);
      loadStats();
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Error",
        description: "Failed to translate",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update translation
  const handleUpdate = async (id: string, value: string, reviewed: boolean) => {
    try {
      const { error } = await supabase
        .from('translations')
        .update({ value, reviewed, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Updated",
        description: "Translation updated successfully",
      });
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: "Failed to update translation",
        variant: "destructive"
      });
    }
  };

  // Reload i18n cache
  const handleReloadCache = () => {
    window.location.reload();
    toast({
      title: "Cache reloaded",
      description: "Translations have been refreshed",
    });
  };

  const filteredTranslations = translations.filter(t => 
    t.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🌍</span> Translation Manager (Database)
          </CardTitle>
          <CardDescription>
            Centralized translation system - All changes are instant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {languages.map((lang) => (
              <Card key={lang.code} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{lang.flag}</span>
                  <Badge variant={stats[lang.code]?.total > 0 ? "default" : "secondary"}>
                    {stats[lang.code]?.total || 0} keys
                  </Badge>
                </div>
                <h3 className="font-semibold">{lang.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {stats[lang.code]?.reviewed || 0} reviewed
                </p>
                <div className="mt-2 space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleTranslateAll(lang.code)}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Translate'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedLang(lang.code)}
                  >
                    View
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search translations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleReloadCache} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Cache
            </Button>
          </div>

          <Tabs value={selectedLang} onValueChange={setSelectedLang}>
            <TabsList className="mb-4">
              {languages.map(lang => (
                <TabsTrigger key={lang.code} value={lang.code}>
                  {lang.flag} {lang.code.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>

            {languages.map(lang => (
              <TabsContent key={lang.code} value={lang.code}>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Translation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTranslations.map((trans) => (
                        <TableRow key={trans.id}>
                          <TableCell className="font-mono text-sm">{trans.key}</TableCell>
                          <TableCell>
                            <Input
                              defaultValue={trans.value}
                              onBlur={(e) => handleUpdate(trans.id, e.target.value, trans.reviewed)}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {trans.ai_generated && (
                                <Badge variant="outline">AI</Badge>
                              )}
                              {trans.reviewed ? (
                                <Badge variant="default">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Reviewed
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={trans.reviewed ? "outline" : "default"}
                              onClick={() => handleUpdate(trans.id, trans.value, !trans.reviewed)}
                            >
                              {trans.reviewed ? 'Unreview' : 'Mark Reviewed'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
