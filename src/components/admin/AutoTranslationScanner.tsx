import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, History, BarChart3, Copy, Check, Trash2, AlertTriangle, CheckCircle, XCircle, Wand2, FileCode, Languages, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DetectedIssue {
  type: string;
  text: string;
  line: number;
  detectedLanguage: "fr" | "en" | "mixed" | "unknown";
  suggestedKey: string;
  suggestedFr: string;
  suggestedEn: string;
  fix: string;
  context: string;
}

interface AnalysisResult {
  issues: DetectedIssue[];
  summary: { total: number; fr: number; en: number; mixed: number };
  correctedCode: string;
  translationsFr: Record<string, unknown>;
  translationsEn: Record<string, unknown>;
}

interface AuditRecord {
  id: string;
  file_path: string | null;
  code_snippet: string | null;
  issues: unknown[];
  corrected_code: string | null;
  translations_fr: Record<string, unknown> | null;
  translations_en: Record<string, unknown> | null;
  total_issues: number;
  fr_count: number;
  en_count: number;
  mixed_count: number;
  created_at: string;
}

export default function AutoTranslationScanner() {
  const [activeTab, setActiveTab] = useState("analyze");
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [history, setHistory] = useState<AuditRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [stats, setStats] = useState({ total: 0, fr: 0, en: 0, mixed: 0, scans: 0 });

  // Load history
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("translation_audit_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const records: AuditRecord[] = (data || []).map(record => ({
        id: record.id,
        file_path: record.file_path,
        code_snippet: record.code_snippet,
        issues: Array.isArray(record.issues) ? record.issues : [],
        corrected_code: record.corrected_code,
        translations_fr: typeof record.translations_fr === 'object' ? record.translations_fr as Record<string, unknown> : {},
        translations_en: typeof record.translations_en === 'object' ? record.translations_en as Record<string, unknown> : {},
        total_issues: record.total_issues || 0,
        fr_count: record.fr_count || 0,
        en_count: record.en_count || 0,
        mixed_count: record.mixed_count || 0,
        created_at: record.created_at,
      }));
      
      setHistory(records);

      // Calculate stats
      const totalIssues = records.reduce((sum, r) => sum + (r.total_issues || 0), 0);
      const frIssues = records.reduce((sum, r) => sum + (r.fr_count || 0), 0);
      const enIssues = records.reduce((sum, r) => sum + (r.en_count || 0), 0);
      const mixedIssues = records.reduce((sum, r) => sum + (r.mixed_count || 0), 0);
      
      setStats({
        total: totalIssues,
        fr: frIssues,
        en: enIssues,
        mixed: mixedIssues,
        scans: records.length,
      });
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Analyze code with AI
  const analyzeCode = async () => {
    if (!code.trim()) {
      toast.error("Veuillez coller du code à analyser");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("scan-translation-issues", {
        body: { code, fileName: fileName || "unknown.tsx" },
      });

      if (error) throw error;

      setResult(data);

      // Save to history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("translation_audit_results").insert({
          user_id: user.id,
          file_path: fileName || null,
          code_snippet: code.substring(0, 5000),
          issues: data.issues,
          corrected_code: data.correctedCode?.substring(0, 50000),
          translations_fr: data.translationsFr,
          translations_en: data.translationsEn,
          total_issues: data.summary?.total || 0,
          fr_count: data.summary?.fr || 0,
          en_count: data.summary?.en || 0,
          mixed_count: data.summary?.mixed || 0,
        });
        
        loadHistory();
      }

      if (data.issues?.length > 0) {
        toast.success(`${data.issues.length} problème(s) de traduction détecté(s)`);
      } else {
        toast.success("Aucun problème de traduction détecté !");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success("Copié !");
    } catch {
      toast.error("Erreur de copie");
    }
  };

  // Delete history item
  const deleteHistoryItem = async (id: string) => {
    try {
      await supabase.from("translation_audit_results").delete().eq("id", id);
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success("Supprimé");
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  // Language badge
  const getLanguageBadge = (lang: string) => {
    switch (lang) {
      case "fr":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">🇫🇷 FR</Badge>;
      case "en":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">🇬🇧 EN</Badge>;
      case "mixed":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">🔄 Mix</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground">❓</Badge>;
    }
  };

  // Type badge
  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      toast: "bg-green-500/10 text-green-500 border-green-500/30",
      dialog: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      button: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      prop: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
      jsx_text: "bg-pink-500/10 text-pink-500 border-pink-500/30",
      error: "bg-red-500/10 text-red-500 border-red-500/30",
      alert: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    };
    return <Badge variant="outline" className={colors[type] || "bg-muted"}>{type}</Badge>;
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          Scanner de Traductions IA
        </CardTitle>
        <CardDescription>
          Analysez votre code avec l'IA pour détecter les textes non traduits (FR/EN/Mixte)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="analyze" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Analyse IA
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </TabsTrigger>
          </TabsList>

          {/* AI Analysis Tab */}
          <TabsContent value="analyze" className="space-y-4">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nom du fichier (ex: BlogWizard.tsx)"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              />
              <textarea
                placeholder={`Collez votre code React/TypeScript ici...\n\nExemples de textes détectés:\n- toast.success("Opération réussie")\n- <Button>Enregistrer</Button>\n- placeholder="Entrez votre email"`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full min-h-[200px] p-3 font-mono text-sm bg-muted rounded-lg border border-border resize-y"
              />
              <div className="flex gap-2">
                <Button onClick={analyzeCode} disabled={isAnalyzing} className="flex-1">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyse IA en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyser avec Gemini AI
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => { setCode(""); setFileName(""); setResult(null); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>

            {result && (
              <div className="space-y-4 mt-6">
                {/* Summary */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 flex-wrap">
                  <div className="flex items-center gap-2">
                    {result.summary.total === 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="font-medium">
                      {result.summary.total} problème(s) détecté(s)
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500">🇫🇷 {result.summary.fr}</Badge>
                    <Badge variant="outline" className="bg-red-500/10 text-red-500">🇬🇧 {result.summary.en}</Badge>
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-500">🔄 {result.summary.mixed}</Badge>
                  </div>
                </div>

                {/* Issues List */}
                {result.issues.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Problèmes détectés
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {result.issues.map((issue, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getTypeBadge(issue.type)}
                                {getLanguageBadge(issue.detectedLanguage)}
                                <span className="text-xs text-muted-foreground">
                                  Ligne {issue.line}
                                </span>
                              </div>
                              <p className="font-medium text-destructive">"{issue.text}"</p>
                              <div className="text-xs space-y-1 pt-2 border-t border-border">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  <span className="text-muted-foreground">Clé:</span>
                                  <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs">t.{issue.suggestedKey}</code>
                                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`{t.${issue.suggestedKey}}`, `key-${idx}`)} className="h-6 px-2">
                                    {copiedField === `key-${idx}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div className="bg-blue-500/10 p-2 rounded text-xs">
                                    <span className="font-medium text-blue-600">🇫🇷 FR:</span> {issue.suggestedFr}
                                  </div>
                                  <div className="bg-red-500/10 p-2 rounded text-xs">
                                    <span className="font-medium text-red-600">🇬🇧 EN:</span> {issue.suggestedEn}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Corrected Code */}
                {result.correctedCode && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Wand2 className="h-5 w-5 text-green-500" />
                          Code Corrigé
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(result.correctedCode, "code")}
                        >
                          {copiedField === "code" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          Copier
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <pre className="text-xs font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap">{result.correctedCode}</pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Translations JSON */}
                {(Object.keys(result.translationsFr).length > 0 || Object.keys(result.translationsEn).length > 0) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileCode className="h-5 w-5 text-purple-500" />
                          Traductions à Ajouter
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(
                            `// FR:\n${JSON.stringify(result.translationsFr, null, 2)}\n\n// EN:\n${JSON.stringify(result.translationsEn, null, 2)}`,
                            "translations"
                          )}
                        >
                          {copiedField === "translations" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          Copier tout
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-blue-600">🇫🇷 Français</h4>
                          <ScrollArea className="h-[150px]">
                            <pre className="text-xs font-mono bg-blue-500/10 p-3 rounded-lg">{JSON.stringify(result.translationsFr, null, 2)}</pre>
                          </ScrollArea>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-red-600">🇬🇧 English</h4>
                          <ScrollArea className="h-[150px]">
                            <pre className="text-xs font-mono bg-red-500/10 p-3 rounded-lg">{JSON.stringify(result.translationsEn, null, 2)}</pre>
                          </ScrollArea>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Analyses récentes</h4>
              <Button variant="outline" size="sm" onClick={loadHistory} disabled={isLoadingHistory}>
                {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune analyse dans l'historique
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {history.map((record) => (
                    <div key={record.id} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {record.total_issues === 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium text-sm truncate max-w-[200px]">
                            {record.file_path || "Fichier inconnu"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(record.created_at).toLocaleString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteHistoryItem(record.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{record.total_issues} problèmes</Badge>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">🇫🇷 {record.fr_count}</Badge>
                        <Badge variant="outline" className="bg-red-500/10 text-red-500">🇬🇧 {record.en_count}</Badge>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500">🔄 {record.mixed_count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{stats.scans}</div>
                <div className="text-sm text-muted-foreground">Analyses</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-destructive">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total problèmes</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-500">{stats.fr}</div>
                <div className="text-sm text-muted-foreground">🇫🇷 Français</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-red-500">{stats.en}</div>
                <div className="text-sm text-muted-foreground">🇬🇧 Anglais</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-orange-500">{stats.mixed}</div>
                <div className="text-sm text-muted-foreground">🔄 Mixte</div>
              </Card>
            </div>
            
            <Card className="p-4 bg-muted/50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Conseils d'utilisation
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>Utilisez toujours t.xxx ou tf() pour les textes utilisateur</li>
                <li>Évitez les textes en dur dans toast, dialog, button, placeholder</li>
                <li>Corrigez les textes mixtes FR/EN en priorité (incohérence)</li>
                <li>Collez le code d'un composant complet pour une analyse exhaustive</li>
              </ul>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
