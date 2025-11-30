import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectedIssue {
  id: string;
  type: 'toast' | 'dialog' | 'jsx_text' | 'prop' | 'button' | 'error' | 'notification' | 'alert' | 'warning' | 'mixed_language';
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
  detectedLanguage?: 'fr' | 'en' | 'mixed' | 'unknown';
}

// French-specific words/patterns
const frenchIndicators = [
  // Common French words
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'en', 'dans', 'sur', 'pour', 'avec', 'sans',
  'ce', 'cette', 'ces', 'cet', 'qui', 'que', 'quoi', 'dont', 'où',
  'est', 'sont', 'être', 'avoir', 'fait', 'faire', 'peut', 'peuvent',
  'votre', 'notre', 'leurs', 'vos', 'nos', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
  'aucun', 'aucune', 'tous', 'toutes', 'tout', 'toute',
  'veuillez', 'merci', 'bonjour', 'bienvenue',
  // French verbs
  'connexion', 'déconnexion', 'télécharger', 'téléchargement', 'enregistrer', 'enregistrement',
  'modifier', 'modification', 'supprimer', 'suppression', 'ajouter', 'ajout',
  'créer', 'création', 'annuler', 'annulation', 'valider', 'validation',
  'confirmer', 'confirmation', 'fermer', 'fermeture', 'ouvrir', 'ouverture',
  'chercher', 'rechercher', 'recherche', 'filtrer', 'filtre',
  'synchroniser', 'synchronisation', 'actualiser', 'actualisation',
  'optimiser', 'optimisation', 'générer', 'génération', 'analyser', 'analyse',
  // French nouns
  'erreur', 'succès', 'attention', 'avertissement', 'information',
  'produit', 'produits', 'article', 'articles', 'collection', 'collections',
  'boutique', 'magasin', 'commande', 'commandes', 'client', 'clients',
  'utilisateur', 'utilisateurs', 'compte', 'comptes', 'paramètres',
  'configuration', 'réglages', 'options', 'préférences',
  // French adjectives
  'nouveau', 'nouvelle', 'nouveaux', 'nouvelles',
  'actif', 'active', 'inactif', 'inactive',
  'disponible', 'indisponible', 'réussi', 'échoué',
];

// English-specific words/patterns
const englishIndicators = [
  // Common English words
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'this', 'that', 'these', 'those', 'which', 'who', 'whom', 'whose',
  'your', 'our', 'their', 'my', 'his', 'her', 'its',
  'please', 'thank', 'welcome', 'hello',
  // English verbs
  'loading', 'loaded', 'save', 'saved', 'saving', 'delete', 'deleted', 'deleting',
  'edit', 'edited', 'editing', 'add', 'added', 'adding', 'create', 'created', 'creating',
  'update', 'updated', 'updating', 'cancel', 'cancelled', 'confirm', 'confirmed',
  'close', 'closed', 'closing', 'open', 'opened', 'opening',
  'search', 'searching', 'filter', 'filtering', 'export', 'exporting', 'import', 'importing',
  'sync', 'syncing', 'synced', 'refresh', 'refreshing',
  'optimize', 'optimizing', 'generate', 'generating', 'analyze', 'analyzing',
  // English nouns
  'error', 'success', 'warning', 'information', 'notification',
  'product', 'products', 'article', 'articles', 'collection', 'collections',
  'shop', 'store', 'order', 'orders', 'customer', 'customers',
  'user', 'users', 'account', 'accounts', 'settings', 'preferences',
  // English adjectives
  'new', 'active', 'inactive', 'available', 'unavailable', 'successful', 'failed',
];

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
  'Avertissement': 'Warning',
  'Information': 'Information',
  'Notification': 'Notification',
  'Oui': 'Yes',
  'Non': 'No',
  'Aucun résultat': 'No results',
  'Aucun': 'None',
  'Aucune': 'None',
  'Tout': 'All',
  'Tous': 'All',
  'Toutes': 'All',
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
  'Produit': 'Product',
  'Produits': 'Products',
  'Article': 'Article',
  'Articles': 'Articles',
  'Collection': 'Collection',
  'Collections': 'Collections',
  'Boutique': 'Store',
  'Commande': 'Order',
  'Commandes': 'Orders',
  'Client': 'Customer',
  'Clients': 'Customers',
  'Utilisateur': 'User',
  'Compte': 'Account',
};

// English to French translations
const enToFrTranslations: Record<string, string> = {};
Object.entries(frToEnTranslations).forEach(([fr, en]) => {
  enToFrTranslations[en] = fr;
});

function detectLanguage(text: string): 'fr' | 'en' | 'mixed' | 'unknown' {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let frScore = 0;
  let enScore = 0;
  
  // Check for French accented characters (strong indicator)
  if (/[àâäéèêëïîôùûüÿçœæ]/i.test(text)) {
    frScore += 3;
  }
  
  // Check word matches
  words.forEach(word => {
    const cleanWord = word.replace(/[^a-zàâäéèêëïîôùûüÿçœæ]/gi, '');
    if (cleanWord.length < 2) return;
    
    if (frenchIndicators.includes(cleanWord)) {
      frScore += 1;
    }
    if (englishIndicators.includes(cleanWord)) {
      enScore += 1;
    }
  });
  
  // Determine language
  const totalScore = frScore + enScore;
  if (totalScore === 0) return 'unknown';
  
  const frRatio = frScore / totalScore;
  const enRatio = enScore / totalScore;
  
  // If both languages have significant presence, it's mixed
  if (frScore > 0 && enScore > 0 && Math.abs(frRatio - enRatio) < 0.3) {
    return 'mixed';
  }
  
  if (frScore > enScore) return 'fr';
  if (enScore > frScore) return 'en';
  
  return 'unknown';
}

function translateToEnglish(frenchText: string): string {
  if (frToEnTranslations[frenchText]) {
    return frToEnTranslations[frenchText];
  }

  let result = frenchText;
  for (const [fr, en] of Object.entries(frToEnTranslations)) {
    if (result.toLowerCase().includes(fr.toLowerCase())) {
      result = result.replace(new RegExp(fr, 'gi'), en);
    }
  }

  if (result === frenchText) {
    return `[EN] ${frenchText}`;
  }

  return result;
}

function translateToFrench(englishText: string): string {
  if (enToFrTranslations[englishText]) {
    return enToFrTranslations[englishText];
  }

  let result = englishText;
  for (const [en, fr] of Object.entries(enToFrTranslations)) {
    if (result.toLowerCase().includes(en.toLowerCase())) {
      result = result.replace(new RegExp(en, 'gi'), fr);
    }
  }

  if (result === englishText) {
    return `[FR] ${englishText}`;
  }

  return result;
}

function generateTranslationKey(text: string, prefix: string = 'common'): string {
  const key = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
    if (line.includes('t.') || line.includes('t(') || line.includes('{t.') || line.includes('tf(') || line.includes('useTranslation')) {
      return;
    }

    // Skip imports, comments, and type definitions
    if (line.trim().startsWith('import ') || line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('interface ') || line.trim().startsWith('type ')) {
      return;
    }

    let match;

    // 1. Detect toast.success/error/info/warning("text")
    const toastRegex = /toast\.(success|error|info|warning|loading)\s*\(\s*["'`]([^"'`]+)["'`]/g;
    while ((match = toastRegex.exec(line)) !== null) {
      const text = match[2];
      if (text.length > 2) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `toast-${lineNum}-${issues.length}`,
          type: 'toast',
          severity: 'critical',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'toasts'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line.replace(`"${text}"`, `t.${generateTranslationKey(text, 'toasts')}`).replace(`'${text}'`, `t.${generateTranslationKey(text, 'toasts')}`),
          detectedLanguage: detectedLang
        });
      }
    }

    // 2. Detect toast({ title: "text" }) or toast({ description: "text" })
    const toastObjRegex = /toast\s*\(\s*\{\s*(?:title|description)\s*:\s*["'`]([^"'`]+)["'`]/g;
    while ((match = toastObjRegex.exec(line)) !== null) {
      const text = match[1];
      if (text.length > 2) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `toast-obj-${lineNum}-${issues.length}`,
          type: 'toast',
          severity: 'critical',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'toasts'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line.replace(`"${text}"`, `t.${generateTranslationKey(text, 'toasts')}`).replace(`'${text}'`, `t.${generateTranslationKey(text, 'toasts')}`),
          detectedLanguage: detectedLang
        });
      }
    }

    // 3. Detect Dialog components
    const dialogRegex = /<(DialogTitle|CardTitle|AlertDialogTitle|DialogDescription|AlertDialogDescription|SheetTitle|SheetDescription|DrawerTitle|DrawerDescription)[^>]*>([^<{]+)<\//gi;
    while ((match = dialogRegex.exec(line)) !== null) {
      const text = match[2].trim();
      if (text.length > 1 && !text.match(/^\s*$/)) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `dialog-${lineNum}-${issues.length}`,
          type: 'dialog',
          severity: 'high',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'dialogs'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'dialogs')}}<`),
          detectedLanguage: detectedLang
        });
      }
    }

    // 4. Detect Alert components
    const alertRegex = /<(AlertTitle|AlertDescription)[^>]*>([^<{]+)<\//gi;
    while ((match = alertRegex.exec(line)) !== null) {
      const text = match[2].trim();
      if (text.length > 1 && !text.match(/^\s*$/)) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `alert-${lineNum}-${issues.length}`,
          type: 'alert',
          severity: 'high',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'alerts'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'alerts')}}<`),
          detectedLanguage: detectedLang
        });
      }
    }

    // 5. Detect Button/Link children text
    const buttonTextRegex = /<(Button|Link|Badge)[^>]*>([^<{]+)<\/(Button|Link|Badge)>/gi;
    while ((match = buttonTextRegex.exec(line)) !== null) {
      const text = match[2].trim();
      if (text.length > 1 && !text.match(/^\s*$/) && !text.match(/^[0-9.,€$%]+$/)) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `btn-${lineNum}-${issues.length}`,
          type: 'button',
          severity: 'high',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'buttons'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'buttons')}}<`),
          detectedLanguage: detectedLang
        });
      }
    }

    // 6. Detect hardcoded props
    const propsRegex = /(title|label|placeholder|description|alt|message|tooltip|hint|helperText|errorMessage|successMessage)=["'`]([^"'`{]+)["'`]/gi;
    while ((match = propsRegex.exec(line)) !== null) {
      const propName = match[1].toLowerCase();
      const text = match[2];
      if (text.length > 2 && !text.match(/^[a-z_-]+$/i) && !text.match(/^[0-9.,€$%]+$/) && !text.startsWith('http')) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `prop-${lineNum}-${issues.length}`,
          type: 'prop',
          severity: 'medium',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, propName + 's'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line.replace(`${match[1]}="${text}"`, `${match[1]}={t.${generateTranslationKey(text, propName + 's')}}`).replace(`${match[1]}='${text}'`, `${match[1]}={t.${generateTranslationKey(text, propName + 's')}}`),
          detectedLanguage: detectedLang
        });
      }
    }

    // 7. Detect notification-related patterns
    const notificationRegex = /(?:notification|notify|alert)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    while ((match = notificationRegex.exec(line)) !== null) {
      const text = match[1];
      if (text.length > 2) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `notification-${lineNum}-${issues.length}`,
          type: 'notification',
          severity: 'critical',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'notifications'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line.replace(`"${text}"`, `t.${generateTranslationKey(text, 'notifications')}`),
          detectedLanguage: detectedLang
        });
      }
    }

    // 8. Detect console warnings/errors with user-facing messages
    const consoleRegex = /console\.(warn|error)\s*\(\s*["'`]([^"'`]+)["'`]/g;
    while ((match = consoleRegex.exec(line)) !== null) {
      const text = match[2];
      // Only flag if it looks like a user-facing message
      if (text.length > 10 && (detectLanguage(text) === 'fr' || detectLanguage(text) === 'en')) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `warning-${lineNum}-${issues.length}`,
          type: 'warning',
          severity: 'medium',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'logs'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line,
          detectedLanguage: detectedLang
        });
      }
    }

    // 9. Detect JSX text content with French characters
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
          fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'common')}}<`),
          detectedLanguage: 'fr'
        });
      }
    }

    // 10. Detect throw new Error("text")
    const errorRegex = /throw new Error\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
    while ((match = errorRegex.exec(line)) !== null) {
      const text = match[1];
      if (text.length > 3) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `error-${lineNum}-${issues.length}`,
          type: 'error',
          severity: 'high',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'errors'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line.replace(`"${text}"`, `t.${generateTranslationKey(text, 'errors')}`).replace(`'${text}'`, `t.${generateTranslationKey(text, 'errors')}`),
          detectedLanguage: detectedLang
        });
      }
    }

    // 11. Detect general JSX text content
    const generalJsxRegex = />([A-ZÀ-ÿ][^<>{}"'`\n]{2,})</g;
    while ((match = generalJsxRegex.exec(line)) !== null) {
      const text = match[1].trim();
      if (text.length > 3 && 
          !text.match(/^[0-9.,€$%\s]+$/) && 
          !text.match(/^[A-Z_]+$/) && // Skip constants
          !issues.some(i => i.line === lineNum && i.text === text)) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `jsx-gen-${lineNum}-${issues.length}`,
          type: 'jsx_text',
          severity: 'medium',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'common'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'common')}}<`),
          detectedLanguage: detectedLang
        });
      }
    }

    // 12. Detect heading components (h1-h6, CardTitle, etc.)
    const headingRegex = /<(h[1-6]|CardTitle|CardDescription|Label|FormLabel|FormDescription)[^>]*>([^<{]+)<\//gi;
    while ((match = headingRegex.exec(line)) !== null) {
      const text = match[2].trim();
      if (text.length > 1 && !text.match(/^\s*$/) && !issues.some(i => i.line === lineNum && i.text === text)) {
        const detectedLang = detectLanguage(text);
        issues.push({
          id: `heading-${lineNum}-${issues.length}`,
          type: 'jsx_text',
          severity: 'medium',
          text,
          line: lineNum,
          context: line.trim(),
          suggestedKey: generateTranslationKey(text, 'headings'),
          suggestedTranslation: { 
            fr: detectedLang === 'en' ? translateToFrench(text) : text, 
            en: detectedLang === 'fr' ? translateToEnglish(text) : text 
          },
          fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'headings')}}<`),
          detectedLanguage: detectedLang
        });
      }
    }

    // 13. Detect span/p/div with direct text
    const textContainerRegex = /<(span|p|div|strong|em|b|i)[^>]*>([^<{]+)<\/(span|p|div|strong|em|b|i)>/gi;
    while ((match = textContainerRegex.exec(line)) !== null) {
      const text = match[2].trim();
      if (text.length > 3 && 
          !text.match(/^\s*$/) && 
          !text.match(/^[0-9.,€$%\s]+$/) &&
          !text.match(/^\{.*\}$/) &&
          !issues.some(i => i.line === lineNum && i.text === text)) {
        const detectedLang = detectLanguage(text);
        if (detectedLang !== 'unknown') {
          issues.push({
            id: `text-${lineNum}-${issues.length}`,
            type: 'jsx_text',
            severity: 'medium',
            text,
            line: lineNum,
            context: line.trim(),
            suggestedKey: generateTranslationKey(text, 'common'),
            suggestedTranslation: { 
              fr: detectedLang === 'en' ? translateToFrench(text) : text, 
              en: detectedLang === 'fr' ? translateToEnglish(text) : text 
            },
            fix: line.replace(`>${text}<`, `>{t.${generateTranslationKey(text, 'common')}}<`),
            detectedLanguage: detectedLang
          });
        }
      }
    }
  });

  return issues;
}

function generateCorrectedCode(code: string, issues: DetectedIssue[]): string {
  if (issues.length === 0) return code;
  
  const lines = code.split('\n');
  const sortedIssues = [...issues].sort((a, b) => b.line - a.line);
  
  const issuesByLine = new Map<number, DetectedIssue[]>();
  sortedIssues.forEach(issue => {
    const lineIssues = issuesByLine.get(issue.line) || [];
    lineIssues.push(issue);
    issuesByLine.set(issue.line, lineIssues);
  });
  
  issuesByLine.forEach((lineIssues, lineNum) => {
    let lineContent = lines[lineNum - 1];
    lineIssues.forEach(issue => {
      if (issue.type === 'toast' || issue.type === 'notification') {
        lineContent = lineContent.replace(`"${issue.text}"`, `t.${issue.suggestedKey}`);
        lineContent = lineContent.replace(`'${issue.text}'`, `t.${issue.suggestedKey}`);
      } else if (issue.type === 'prop') {
        const propMatch = lineContent.match(new RegExp(`(${issue.context.match(/(title|label|placeholder|description|alt|message|tooltip|hint)/i)?.[0] || 'title'})=["']${escapeRegex(issue.text)}["']`, 'i'));
        if (propMatch) {
          lineContent = lineContent.replace(propMatch[0], `${propMatch[1]}={t.${issue.suggestedKey}}`);
        }
      } else if (issue.type !== 'warning') {
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
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

    // Count language statistics
    const langStats = {
      french: issues.filter(i => i.detectedLanguage === 'fr').length,
      english: issues.filter(i => i.detectedLanguage === 'en').length,
      mixed: issues.filter(i => i.detectedLanguage === 'mixed').length,
      unknown: issues.filter(i => i.detectedLanguage === 'unknown').length,
    };

    console.log(`✅ Found ${issues.length} issues (FR: ${langStats.french}, EN: ${langStats.english}, Mixed: ${langStats.mixed})`);

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
          alert: issues.filter(i => i.type === 'alert').length,
          notification: issues.filter(i => i.type === 'notification').length,
          warning: issues.filter(i => i.type === 'warning').length,
          button: issues.filter(i => i.type === 'button').length,
          prop: issues.filter(i => i.type === 'prop').length,
          jsx_text: issues.filter(i => i.type === 'jsx_text').length,
          error: issues.filter(i => i.type === 'error').length,
        },
        byLanguage: langStats
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
