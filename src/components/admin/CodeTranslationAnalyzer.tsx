import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Copy, 
  Wand2,
  FileCode,
  Languages,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface DetectedIssue {
  id: string;
  type: 'hardcoded' | 'missing_translation';
  text: string;
  line: number;
  context: string;
  suggestedKey: string;
  suggestedTranslation: {
    fr: string;
    en: string;
  };
}

export default function CodeTranslationAnalyzer() {
  const [code, setCode] = useState("");
  const [issues, setIssues] = useState<DetectedIssue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedTranslations, setGeneratedTranslations] = useState<string>("");

  const analyzeCode = () => {
    setIsAnalyzing(true);
    const detectedIssues: DetectedIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Detect hardcoded text in JSX: >Text content<
      const jsxTextRegex = />([A-ZÀ-ÿa-z][^<>{}"'`]*[a-zÀ-ÿ.,!?])</g;
      let match;
      while ((match = jsxTextRegex.exec(line)) !== null) {
        const text = match[1].trim();
        if (text.length > 2 && !text.startsWith('{') && !text.match(/^[0-9.,€$%]+$/)) {
          // Check if it's not already using translation
          if (!line.includes('t.') && !line.includes('t(') && !line.includes('{t.')) {
            detectedIssues.push({
              id: `jsx-${lineNum}-${detectedIssues.length}`,
              type: 'hardcoded',
              text: text,
              line: lineNum,
              context: line.trim(),
              suggestedKey: generateTranslationKey(text),
              suggestedTranslation: {
                fr: text,
                en: translateToEnglish(text)
              }
            });
          }
        }
      }

      // Detect hardcoded strings in common patterns
      // toast.success("Text"), toast.error("Text"), etc.
      const toastRegex = /toast\.(success|error|info|warning)\s*\(\s*["'`]([^"'`]+)["'`]/g;
      while ((match = toastRegex.exec(line)) !== null) {
        const text = match[2];
        if (!line.includes('t.') && !line.includes('t(')) {
          detectedIssues.push({
            id: `toast-${lineNum}-${detectedIssues.length}`,
            type: 'hardcoded',
            text: text,
            line: lineNum,
            context: line.trim(),
            suggestedKey: `toasts.${generateTranslationKey(text)}`,
            suggestedTranslation: {
              fr: text,
              en: translateToEnglish(text)
            }
          });
        }
      }

      // Detect hardcoded strings in title, label, placeholder props
      const propsRegex = /(title|label|placeholder|description|alt|message)=["'`]([^"'`{]+)["'`]/gi;
      while ((match = propsRegex.exec(line)) !== null) {
        const propName = match[1].toLowerCase();
        const text = match[2];
        if (text.length > 2 && !text.match(/^[a-z_-]+$/i)) {
          detectedIssues.push({
            id: `prop-${lineNum}-${detectedIssues.length}`,
            type: 'hardcoded',
            text: text,
            line: lineNum,
            context: line.trim(),
            suggestedKey: `${propName}s.${generateTranslationKey(text)}`,
            suggestedTranslation: {
              fr: text,
              en: translateToEnglish(text)
            }
          });
        }
      }

      // Detect Button/Link children text
      const buttonTextRegex = /<(Button|Link)[^>]*>([^<{]+)<\/(Button|Link)>/gi;
      while ((match = buttonTextRegex.exec(line)) !== null) {
        const text = match[2].trim();
        if (text.length > 1 && !line.includes('{t.')) {
          detectedIssues.push({
            id: `btn-${lineNum}-${detectedIssues.length}`,
            type: 'hardcoded',
            text: text,
            line: lineNum,
            context: line.trim(),
            suggestedKey: `buttons.${generateTranslationKey(text)}`,
            suggestedTranslation: {
              fr: text,
              en: translateToEnglish(text)
            }
          });
        }
      }

      // Detect DialogTitle, CardTitle, etc.
      const titleComponentRegex = /<(DialogTitle|CardTitle|AlertDialogTitle)[^>]*>([^<{]+)<\//gi;
      while ((match = titleComponentRegex.exec(line)) !== null) {
        const text = match[2].trim();
        if (text.length > 1 && !line.includes('{t.')) {
          detectedIssues.push({
            id: `title-${lineNum}-${detectedIssues.length}`,
            type: 'hardcoded',
            text: text,
            line: lineNum,
            context: line.trim(),
            suggestedKey: `dialogs.${generateTranslationKey(text)}`,
            suggestedTranslation: {
              fr: text,
              en: translateToEnglish(text)
            }
          });
        }
      }
    });

    setIssues(detectedIssues);
    setIsAnalyzing(false);

    if (detectedIssues.length === 0) {
      toast.success("Aucun texte en dur détecté !");
    } else {
      toast.warning(`${detectedIssues.length} texte(s) en dur détecté(s)`);
    }
  };

  const generateTranslationKey = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join('_');
  };

  const translateToEnglish = (frenchText: string): string => {
    // Simple mapping for common French phrases
    const translations: Record<string, string> = {
      'Chargement...': 'Loading...',
      'Enregistrer': 'Save',
      'Annuler': 'Cancel',
      'Supprimer': 'Delete',
      'Modifier': 'Edit',
      'Ajouter': 'Add',
      'Confirmer': 'Confirm',
      'Fermer': 'Close',
      'Suivant': 'Next',
      'Précédent': 'Previous',
      'Rechercher': 'Search',
      'Filtrer': 'Filter',
      'Exporter': 'Export',
      'Importer': 'Import',
      'Synchroniser': 'Synchronize',
      'Actualiser': 'Refresh',
      'Erreur': 'Error',
      'Succès': 'Success',
      'Attention': 'Warning',
      'Information': 'Information',
      'Oui': 'Yes',
      'Non': 'No',
      'Aucun résultat': 'No results',
      'Veuillez patienter': 'Please wait',
      'Connexion réussie': 'Successfully connected',
      'Opération réussie': 'Operation successful',
      'Une erreur est survenue': 'An error occurred',
    };

    // Check for exact match
    if (translations[frenchText]) {
      return translations[frenchText];
    }

    // Check for partial matches
    for (const [fr, en] of Object.entries(translations)) {
      if (frenchText.toLowerCase().includes(fr.toLowerCase())) {
        return frenchText.replace(new RegExp(fr, 'gi'), en);
      }
    }

    // Return placeholder for manual translation
    return `[EN] ${frenchText}`;
  };

  const generateTranslationFile = () => {
    if (issues.length === 0) {
      toast.error("Aucune traduction à générer");
      return;
    }

    const frTranslations: Record<string, any> = {};
    const enTranslations: Record<string, any> = {};

    issues.forEach(issue => {
      const keys = issue.suggestedKey.split('.');
      let frObj: Record<string, any> = frTranslations;
      let enObj: Record<string, any> = enTranslations;

      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          frObj[key] = issue.suggestedTranslation.fr;
          enObj[key] = issue.suggestedTranslation.en;
        } else {
          if (!frObj[key]) frObj[key] = {};
          if (!enObj[key]) enObj[key] = {};
          frObj = frObj[key];
          enObj = enObj[key];
        }
      });
    });

    const output = `// ===== TRADUCTIONS FR =====
${JSON.stringify(frTranslations, null, 2)}

// ===== TRANSLATIONS EN =====
${JSON.stringify(enTranslations, null, 2)}

// ===== CODE FIXES =====
${issues.map(issue => `
// Ligne ${issue.line}: "${issue.text}"
// Remplacer par: {t.${issue.suggestedKey}}
`).join('')}`;

    setGeneratedTranslations(output);
    toast.success("Traductions générées !");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papier");
  };

  const copyFix = (issue: DetectedIssue) => {
    const fix = `{t.${issue.suggestedKey}}`;
    navigator.clipboard.writeText(fix);
    toast.success(`Copié: ${fix}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            Analyseur de Traductions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Collez le code à analyser (TSX/JSX)
            </label>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`// Collez votre code ici...
// Exemple:
<Button>Enregistrer</Button>
toast.success("Opération réussie")
<DialogTitle>Confirmer la suppression</DialogTitle>`}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={analyzeCode} 
              disabled={!code.trim() || isAnalyzing}
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-2" />
              {isAnalyzing ? "Analyse..." : "Analyser le code"}
            </Button>
            <Button 
              onClick={generateTranslationFile}
              disabled={issues.length === 0}
              variant="outline"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Générer traductions
            </Button>
          </div>
        </CardContent>
      </Card>

      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {issues.length} Texte(s) en dur détecté(s)
              </span>
              <Badge variant="destructive">{issues.length} issues</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {issues.map((issue) => (
                  <div 
                    key={issue.id} 
                    className="p-4 border rounded-lg bg-muted/30 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Ligne {issue.line}
                          </Badge>
                          <Badge 
                            variant={issue.type === 'hardcoded' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {issue.type === 'hardcoded' ? 'Texte en dur' : 'Traduction manquante'}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm mb-1">
                          "{issue.text}"
                        </p>
                        <code className="text-xs text-muted-foreground block bg-muted p-2 rounded overflow-x-auto">
                          {issue.context}
                        </code>
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Clé suggérée:</span>
                        <code className="bg-primary/10 px-2 py-0.5 rounded text-primary font-mono text-xs">
                          t.{issue.suggestedKey}
                        </code>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyFix(issue)}
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-blue-500/10 p-2 rounded">
                          <span className="font-medium text-blue-600">FR:</span>{" "}
                          {issue.suggestedTranslation.fr}
                        </div>
                        <div className="bg-green-500/10 p-2 rounded">
                          <span className="font-medium text-green-600">EN:</span>{" "}
                          {issue.suggestedTranslation.en}
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

      {generatedTranslations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-green-500" />
                Traductions Générées
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(generatedTranslations)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copier tout
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap">
                {generatedTranslations}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {issues.length === 0 && code.trim() && !isAnalyzing && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Aucun texte en dur détecté</p>
            <p className="text-sm text-muted-foreground">
              Le code analysé semble correctement internationalisé.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
