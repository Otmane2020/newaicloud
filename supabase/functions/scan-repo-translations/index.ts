import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslationIssue {
  filePath: string;
  line: number;
  type: 'toast' | 'dialog' | 'alert' | 'prop' | 'jsx_text' | 'button';
  original: string;
  suggestedKey: string;
  suggestedFr: string;
  suggestedEn: string;
  context: string;
}

interface ScanResult {
  totalFiles: number;
  filesScanned: number;
  filesWithIssues: number;
  totalIssues: number;
  issuesByType: Record<string, number>;
  issues: TranslationIssue[];
  aggregatedTranslations: {
    fr: Record<string, unknown>;
    en: Record<string, unknown>;
  };
}

// Files to scan - comprehensive list
const FILES_TO_SCAN = [
  // Pages
  "src/pages/Index.tsx",
  "src/pages/Dashboard.tsx",
  "src/pages/Products.tsx",
  "src/pages/Collections.tsx",
  "src/pages/ArticleManagement.tsx",
  "src/pages/Settings.tsx",
  "src/pages/Pricing.tsx",
  "src/pages/Auth.tsx",
  "src/pages/Onboarding.tsx",
  "src/pages/SuperAdmin.tsx",
  "src/pages/Blog.tsx",
  "src/pages/Demo.tsx",
  "src/pages/ShopifyApp.tsx",
  "src/pages/Account.tsx",
  "src/pages/Admin.tsx",
  "src/pages/Integration.tsx",
  "src/pages/SEO.tsx",
  "src/pages/Chat.tsx",
  "src/pages/Subscription.tsx",
  // Admin components
  "src/components/admin/EmailInbox.tsx",
  "src/components/admin/SystemStatusDashboard.tsx",
  "src/components/admin/VideoAdsStudio.tsx",
  // Blog components
  "src/components/blog/ArticleWizard.tsx",
  "src/components/blog/BlogWizard.tsx",
  "src/components/blog/CampaignWizard.tsx",
  "src/components/blog/BlogOpportunities.tsx",
  // SEO components
  "src/components/seo/SeoOptimization.tsx",
  "src/components/seo/SmartPricingAI.tsx",
  "src/components/seo/CollectionOptimization.tsx",
  "src/components/seo/PageOptimization.tsx",
  "src/components/seo/TagOptimization.tsx",
  "src/components/seo/SeoAltImage.tsx",
  "src/components/seo/HomePageSeo.tsx",
  "src/components/seo/GoogleSearchConsole.tsx",
  "src/components/seo/GoogleMerchant.tsx",
  // Root components
  "src/components/StoreSelector.tsx",
  "src/components/Navigation.tsx",
  "src/components/AutoSyncProgressDialog.tsx",
  "src/components/UpgradeDialog.tsx",
  // Dashboard
  "src/components/dashboard/QuickActions.tsx",
  "src/components/dashboard/DashboardStats.tsx",
  // Integration
  "src/components/integration/ShopifyOAuthIntegration.tsx",
  // Hooks
  "src/hooks/useShopifySync.ts",
  "src/hooks/useAutoSync.ts",
];

async function fetchFileFromGitHub(filePath: string, token: string, owner: string, repo: string): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    console.log(`[GitHub] Fetching: ${filePath}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'NewAI-Translation-Scanner'
      }
    });

    if (!response.ok) {
      console.log(`[GitHub] File not found or error: ${filePath} - Status: ${response.status}`);
      return null;
    }

    const content = await response.text();
    console.log(`[GitHub] Successfully fetched: ${filePath} (${content.length} chars)`);
    return content;
  } catch (error) {
    console.error(`[GitHub] Error fetching ${filePath}:`, error);
    return null;
  }
}

async function analyzeFileWithAI(filePath: string, code: string, apiKey: string): Promise<TranslationIssue[]> {
  try {
    console.log(`[AI] Analyzing: ${filePath}`);
    
    const systemPrompt = `Tu es un expert en internationalisation React/TypeScript. Analyse ce code et détecte TOUS les textes hardcodés qui devraient être traduits.

PATTERNS À DÉTECTER:
1. toast.success("texte"), toast.error("texte"), toast.info("texte"), toast.warning("texte")
2. <DialogTitle>texte</DialogTitle>, <DialogDescription>texte</DialogDescription>
3. <AlertTitle>texte</AlertTitle>, <AlertDescription>texte</AlertDescription>
4. Props hardcodées: title="texte", label="texte", placeholder="texte", description="texte"
5. Texte JSX: <Button>texte</Button>, <span>texte</span>, <p>texte</p>, <h1>texte</h1>
6. Template literals avec texte: texte interpolé

NE PAS DÉTECTER:
- Variables: {t.something}, {variable}
- Texte déjà traduit: t("key"), t.namespace.key
- Console.log, commentaires
- URLs, noms de fichiers
- Nombres seuls

RÉPONDS EN JSON STRICT:
{
  "issues": [
    {
      "line": 42,
      "type": "toast|dialog|alert|prop|jsx_text|button",
      "original": "texte original",
      "suggestedKey": "t.namespace.keyName",
      "suggestedFr": "traduction française",
      "suggestedEn": "english translation",
      "context": "ligne de code environnante"
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Fichier: ${filePath}\n\nCode:\n${code.substring(0, 15000)}` }
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error(`[AI] Error for ${filePath}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`[AI] No JSON found for ${filePath}`);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const issues: TranslationIssue[] = (parsed.issues || []).map((issue: any) => ({
      filePath,
      line: issue.line || 0,
      type: issue.type || 'jsx_text',
      original: issue.original || '',
      suggestedKey: issue.suggestedKey || '',
      suggestedFr: issue.suggestedFr || issue.original || '',
      suggestedEn: issue.suggestedEn || '',
      context: issue.context || ''
    }));

    console.log(`[AI] Found ${issues.length} issues in ${filePath}`);
    return issues;
  } catch (error) {
    console.error(`[AI] Error analyzing ${filePath}:`, error);
    return [];
  }
}

function aggregateTranslations(issues: TranslationIssue[]): { fr: Record<string, unknown>; en: Record<string, unknown> } {
  const fr: Record<string, unknown> = {};
  const en: Record<string, unknown> = {};

  for (const issue of issues) {
    if (!issue.suggestedKey || !issue.suggestedFr) continue;

    // Parse key like "t.toasts.success" or "t.dialogs.title"
    const keyParts = issue.suggestedKey.replace(/^t\./, '').split('.');
    
    // Build nested structure for FR
    let currentFr: Record<string, unknown> = fr;
    for (let i = 0; i < keyParts.length - 1; i++) {
      if (!currentFr[keyParts[i]]) {
        currentFr[keyParts[i]] = {};
      }
      currentFr = currentFr[keyParts[i]] as Record<string, unknown>;
    }
    currentFr[keyParts[keyParts.length - 1]] = issue.suggestedFr;

    // Build nested structure for EN
    let currentEn: Record<string, unknown> = en;
    for (let i = 0; i < keyParts.length - 1; i++) {
      if (!currentEn[keyParts[i]]) {
        currentEn[keyParts[i]] = {};
      }
      currentEn = currentEn[keyParts[i]] as Record<string, unknown>;
    }
    currentEn[keyParts[keyParts.length - 1]] = issue.suggestedEn || issue.suggestedFr;
  }

  return { fr, en };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    // Health check
    if (body.healthCheck === true) {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[scan-repo-translations] Starting automatic scan...');

    // Get GitHub credentials
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER');
    const GITHUB_REPO = Deno.env.get('GITHUB_REPO');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      throw new Error('GitHub credentials not configured (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)');
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get custom files list or use default
    const filesToScan = body.files || FILES_TO_SCAN;
    const maxFiles = body.maxFiles || 50; // Limit to prevent timeout
    const limitedFiles = filesToScan.slice(0, maxFiles);

    console.log(`[scan-repo-translations] Scanning ${limitedFiles.length} files...`);

    const allIssues: TranslationIssue[] = [];
    const issuesByType: Record<string, number> = {
      toast: 0,
      dialog: 0,
      alert: 0,
      prop: 0,
      jsx_text: 0,
      button: 0
    };
    let filesScanned = 0;
    let filesWithIssues = 0;

    // Process files in batches of 5 for better performance
    const batchSize = 5;
    for (let i = 0; i < limitedFiles.length; i += batchSize) {
      const batch = limitedFiles.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (filePath: string) => {
        const content = await fetchFileFromGitHub(filePath, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);
        if (!content) return { filePath, issues: [] };
        
        filesScanned++;
        const issues = await analyzeFileWithAI(filePath, content, LOVABLE_API_KEY);
        
        if (issues.length > 0) {
          filesWithIssues++;
        }
        
        return { filePath, issues };
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        for (const issue of result.issues) {
          allIssues.push(issue);
          if (issuesByType[issue.type] !== undefined) {
            issuesByType[issue.type]++;
          }
        }
      }

      console.log(`[scan-repo-translations] Progress: ${Math.min(i + batchSize, limitedFiles.length)}/${limitedFiles.length} files`);
    }

    // Aggregate translations
    const aggregatedTranslations = aggregateTranslations(allIssues);

    const result: ScanResult = {
      totalFiles: limitedFiles.length,
      filesScanned,
      filesWithIssues,
      totalIssues: allIssues.length,
      issuesByType,
      issues: allIssues,
      aggregatedTranslations
    };

    console.log(`[scan-repo-translations] Scan complete: ${result.totalIssues} issues found in ${filesWithIssues} files`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[scan-repo-translations] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      totalFiles: 0,
      filesScanned: 0,
      filesWithIssues: 0,
      totalIssues: 0,
      issuesByType: {},
      issues: [],
      aggregatedTranslations: { fr: {}, en: {} }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
