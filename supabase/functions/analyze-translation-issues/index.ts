import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectedIssue {
  id: string;
  type: 'toast' | 'dialog' | 'jsx_text' | 'prop' | 'button' | 'error';
  severity: 'critical' | 'high' | 'medium';
  text: string;
  line: number;
  context: string;
  suggestedKey: string;
  suggestedTranslation: {
    fr: string;
    en: string;
  };
  fix: string;
}

// Translation mappings for common French phrases
const frToEnTranslations: Record<string, string> = {
  'Chargement...': 'Loading...',
  'Chargement': 'Loading',
  'Enregistrer': 'Save',
  'Annuler': 'Cancel',
  'Supprimer': 'Delete',
  'Modifier': 'Edit',
  'Ajouter': 'Add',
  'Créer': 'Create',
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
  'Copié': 'Copied',
  'Sélectionner': 'Select',
  'Télécharger': 'Download',
  'Voir': 'View',
  'Détails': 'Details',
  'Actions': 'Actions',
  'Paramètres': 'Settings',
  'Configuration': 'Configuration',
  'Optimiser': 'Optimize',
  'Générer': 'Generate',
  'Analyser': 'Analyze',
  'Valider': 'Validate',
  'Appliquer': 'Apply',
  'Réinitialiser': 'Reset',
  'Retour': 'Back',
  'Continuer': 'Continue',
  'Terminer': 'Finish',
  'Nouveau': 'New',
  'Nouvelle': 'New',
  'Mise à jour': 'Update',
  'mis à jour': 'updated',
  'créé': 'created',
  'supprimé': 'deleted',
  'ajouté': 'added',
  'modifié': 'modified',
  'synchronisé': 'synchronized',
  'optimisé': 'optimized',
  'généré': 'generated',
  'importé': 'imported',
  'exporté': 'exported',
  'avec succès': 'successfully',
  'en cours': 'in progress',
  'terminé': 'completed',
  'échoué': 'failed',
  'Aucun': 'None',
  'Aucune': 'None',
  'Tout': 'All',
  'Tous': 'All',
  'Toutes': 'All',
};

function translateToEnglish(frenchText: string): string {
  // Check for exact match
  if (frToEnTranslations[frenchText]) {
    return frToEnTranslations[frenchText];
  }

  // Check for partial matches and build translation
  let result = frenchText;
  for (const [fr, en] of Object.entries(frToEnTranslations)) {
    if (result.toLowerCase().includes(fr.toLowerCase())) {
      result = result.replace(new RegExp(fr, 'gi'), en);
    }
  }

  // If no translation found, return placeholder
  if (result === frenchText) {
    return `[EN] ${frenchText}`;
  }

  return result;
}

function generateTranslationKey(text: string, prefix: string = 'common'): string {
  const key = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('_');
  
  return `${prefix}.${key}`;
}

function analyzeCode(code: string, fileName: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Skip if line already uses translation
    if (line.includes('t.') || line.includes('t(') || line.includes('{t.') || line.includes('tf(')) {
      return;
    }

    // Skip imports and comments
    if (line.trim().startsWith('import ') || line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }

    let match;

    // 1. Detect toast.success/error/info/warning("text")
    const toastRegex = /toast\.(success|error|info|warning|loading)\s*\(\s*["'`]([^"'`]+)["'`]/g;
    while ((match = toastRegex.exec(line)) !== null) {
      const text = match[2];
      if (text.length > 2) {
        issues.push({
          id: `toast-${lineNum}-${issues.length}`,
          type: 'toast',
          severity: 'critical',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'toasts'),
          suggestedTranslation: { fr: text, en: translateToEnglish(text) },
          fix: line.replace(`"${text}"`, `t.${generateTranslationKey(text, 'toasts')}`).replace(`'${text}'`, `t.${generateTranslationKey(text, 'toasts')}`)
        });
      }
    }

    // 2. Detect toast({ title: "text" })
    const toastObjRegex = /toast\s*\(\s*\{\s*(?:title|description)\s*:\s*["'`]([^"'`]+)["'`]/g;
    while ((match = toastObjRegex.exec(line)) !== null) {
      const text = match[1];
      if (text.length > 2) {
        issues.push({
          id: `toast-obj-${lineNum}-${issues.length}`,
          type: 'toast',
          severity: 'critical',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'toasts'),
          suggestedTranslation: { fr: text, en: translateToEnglish(text) },
          fix: line.replace(`"${text}"`, `t.${generateTranslationKey(text, 'toasts')}`).replace(`'${text}'`, `t.${generateTranslationKey(text, 'toasts')}`)
        });
      }
    }

    // 3. Detect DialogTitle, CardTitle, AlertDialogTitle with hardcoded text
    const titleComponentRegex = /<(DialogTitle|CardTitle|AlertDialogTitle|DialogDescription|AlertDialogDescription)[^>]*>([^<{]+)<\//gi;
    while ((match = titleComponentRegex.exec(line)) !== null) {
      const text = match[2].trim();
      if (text.length > 1 && !text.match(/^\s*$/)) {
        issues.push({
          id: `dialog-${lineNum}-${issues.length}`,
          type: 'dialog',
          severity: 'high',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'dialogs'),
          suggestedTranslation: { fr: text, en: translateToEnglish(text) },
          fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'dialogs')}}<`)
        });
      }
    }

    // 4. Detect Button/Link children text
    const buttonTextRegex = /<(Button|Link)[^>]*>([^<{]+)<\/(Button|Link)>/gi;
    while ((match = buttonTextRegex.exec(line)) !== null) {
      const text = match[2].trim();
      if (text.length > 1 && !text.match(/^\s*$/) && !text.match(/^[0-9.,€$%]+$/)) {
        issues.push({
          id: `btn-${lineNum}-${issues.length}`,
          type: 'button',
          severity: 'high',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'buttons'),
          suggestedTranslation: { fr: text, en: translateToEnglish(text) },
          fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'buttons')}}<`)
        });
      }
    }

    // 5. Detect hardcoded props: title, label, placeholder, description, alt
    const propsRegex = /(title|label|placeholder|description|alt|message)=["'`]([^"'`{]+)["'`]/gi;
    while ((match = propsRegex.exec(line)) !== null) {
      const propName = match[1].toLowerCase();
      const text = match[2];
      if (text.length > 2 && !text.match(/^[a-z_-]+$/i) && !text.match(/^[0-9.,€$%]+$/)) {
        issues.push({
          id: `prop-${lineNum}-${issues.length}`,
          type: 'prop',
          severity: 'medium',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, propName + 's'),
          suggestedTranslation: { fr: text, en: translateToEnglish(text) },
          fix: line.replace(`${match[1]}="${text}"`, `${match[1]}={t.${generateTranslationKey(text, propName + 's')}}`).replace(`${match[1]}='${text}'`, `${match[1]}={t.${generateTranslationKey(text, propName + 's')}}`)
        });
      }
    }

    // 6. Detect JSX text content with French characters
    const jsxTextRegex = />([^<>{}"'`\n]+[àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ][^<>{}"'`\n]*)</g;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1].trim();
      if (text.length > 3 && !text.match(/^[0-9.,€$%\s]+$/)) {
        issues.push({
          id: `jsx-${lineNum}-${issues.length}`,
          type: 'jsx_text',
          severity: 'medium',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'common'),
          suggestedTranslation: { fr: text, en: translateToEnglish(text) },
          fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'common')}}<`)
        });
      }
    }

    // 7. Detect throw new Error("text")
    const errorRegex = /throw new Error\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
    while ((match = errorRegex.exec(line)) !== null) {
      const text = match[1];
      if (text.length > 3) {
        issues.push({
          id: `error-${lineNum}-${issues.length}`,
          type: 'error',
          severity: 'high',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'errors'),
          suggestedTranslation: { fr: text, en: translateToEnglish(text) },
          fix: line.replace(`"${text}"`, `t.${generateTranslationKey(text, 'errors')}`).replace(`'${text}'`, `t.${generateTranslationKey(text, 'errors')}`)
        });
      }
    }

    // 8. Detect general JSX text content (any text between > and <)
    const generalJsxRegex = />([A-ZÀ-ÿ][^<>{}"'`\n]{2,})</g;
    while ((match = generalJsxRegex.exec(line)) !== null) {
      const text = match[1].trim();
      // Check if not already caught and has meaningful content
      if (text.length > 3 && 
          !text.match(/^[0-9.,€$%\s]+$/) && 
          !issues.some(i => i.line === lineNum && i.text === text)) {
        issues.push({
          id: `jsx-gen-${lineNum}-${issues.length}`,
          type: 'jsx_text',
          severity: 'medium',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'common'),
          suggestedTranslation: { fr: text, en: translateToEnglish(text) },
          fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'common')}}<`)
        });
      }
    }
  });

  return issues;
}

function generateCorrectedCode(code: string, issues: DetectedIssue[]): string {
  if (issues.length === 0) return code;
  
  const lines = code.split('\n');
  
  // Sort issues by line number in reverse to apply fixes from bottom to top
  const sortedIssues = [...issues].sort((a, b) => b.line - a.line);
  
  // Group issues by line
  const issuesByLine = new Map<number, DetectedIssue[]>();
  sortedIssues.forEach(issue => {
    const lineIssues = issuesByLine.get(issue.line) || [];
    lineIssues.push(issue);
    issuesByLine.set(issue.line, lineIssues);
  });
  
  // Apply fixes
  issuesByLine.forEach((lineIssues, lineNum) => {
    let lineContent = lines[lineNum - 1];
    lineIssues.forEach(issue => {
      // Replace hardcoded text with translation key
      if (issue.type === 'toast') {
        lineContent = lineContent.replace(`"${issue.text}"`, `t.${issue.suggestedKey}`);
        lineContent = lineContent.replace(`'${issue.text}'`, `t.${issue.suggestedKey}`);
      } else if (issue.type === 'prop') {
        const propMatch = lineContent.match(new RegExp(`(${issue.context.match(/(title|label|placeholder|description|alt|message)/i)?.[0] || 'title'})=["']${escapeRegex(issue.text)}["']`, 'i'));
        if (propMatch) {
          lineContent = lineContent.replace(propMatch[0], `${propMatch[1]}={t.${issue.suggestedKey}}`);
        }
      } else {
        lineContent = lineContent.replace(`>${issue.text}<`, `>{t.${issue.suggestedKey}}<`);
      }
    });
    lines[lineNum - 1] = lineContent;
  });
  
  return lines.join('\n');
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateTranslationsJson(issues: DetectedIssue[]): { fr: Record<string, any>; en: Record<string, any> } {
  const fr: Record<string, any> = {};
  const en: Record<string, any> = {};
  
  issues.forEach(issue => {
    const keys = issue.suggestedKey.split('.');
    let frObj = fr;
    let enObj = en;
    
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
  
  return { fr, en };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Health check
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { code, fileName } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: 'Code content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📝 Analyzing file: ${fileName || 'unknown'}`);
    console.log(`📊 Code length: ${code.length} characters`);

    const issues = analyzeCode(code, fileName || 'unknown');
    const correctedCode = generateCorrectedCode(code, issues);
    const translations = generateTranslationsJson(issues);

    console.log(`✅ Found ${issues.length} issues`);

    return new Response(JSON.stringify({
      success: true,
      fileName,
      issues,
      issueCount: issues.length,
      correctedCode,
      translations,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        byType: {
          toast: issues.filter(i => i.type === 'toast').length,
          dialog: issues.filter(i => i.type === 'dialog').length,
          button: issues.filter(i => i.type === 'button').length,
          prop: issues.filter(i => i.type === 'prop').length,
          jsx_text: issues.filter(i => i.type === 'jsx_text').length,
          error: issues.filter(i => i.type === 'error').length,
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error analyzing code:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
