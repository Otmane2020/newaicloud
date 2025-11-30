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

// List all files from GitHub repo using Trees API
async function listRepoFiles(token: string, owner: string, repo: string, branch: string = 'main'): Promise<string[]> {
  try {
    // First, get the commit SHA for the branch
    const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`;
    console.log(`[GitHub] Getting branch ref: ${branch}`);
    
    const refResponse = await fetch(refUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'NewAI-Translation-Scanner'
      }
    });

    if (!refResponse.ok) {
      // Try 'master' if 'main' fails
      if (branch === 'main') {
        console.log('[GitHub] Branch "main" not found, trying "master"...');
        return listRepoFiles(token, owner, repo, 'master');
      }
      const errorText = await refResponse.text();
      console.error(`[GitHub] Failed to get branch ref: ${refResponse.status} - ${errorText}`);
      return [];
    }

    const refData = await refResponse.json();
    const commitSha = refData.object?.sha;
    
    if (!commitSha) {
      console.error('[GitHub] No commit SHA found');
      return [];
    }

    console.log(`[GitHub] Got commit SHA: ${commitSha}`);

    // Get the tree recursively
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`;
    
    const treeResponse = await fetch(treeUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'NewAI-Translation-Scanner'
      }
    });

    if (!treeResponse.ok) {
      const errorText = await treeResponse.text();
      console.error(`[GitHub] Failed to get tree: ${treeResponse.status} - ${errorText}`);
      return [];
    }

    const treeData = await treeResponse.json();
    
    // Filter for .tsx and .ts files in src/
    const files = (treeData.tree || [])
      .filter((item: any) => 
        item.type === 'blob' && 
        item.path.startsWith('src/') && 
        (item.path.endsWith('.tsx') || item.path.endsWith('.ts')) &&
        !item.path.includes('node_modules') &&
        !item.path.includes('.test.') &&
        !item.path.includes('.spec.') &&
        !item.path.includes('/ui/') && // Skip shadcn ui components
        !item.path.includes('integrations/supabase') // Skip auto-generated
      )
      .map((item: any) => item.path);

    console.log(`[GitHub] Found ${files.length} source files in repo`);
    return files;
  } catch (error) {
    console.error('[GitHub] Error listing files:', error);
    return [];
  }
}

async function fetchFileFromGitHub(filePath: string, token: string, owner: string, repo: string, branch: string = 'main'): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'NewAI-Translation-Scanner'
      }
    });

    if (!response.ok) {
      // Try master if main fails
      if (branch === 'main') {
        return fetchFileFromGitHub(filePath, token, owner, repo, 'master');
      }
      return null;
    }

    const content = await response.text();
    return content;
  } catch (error) {
    console.error(`[GitHub] Error fetching ${filePath}:`, error);
    return null;
  }
}

async function analyzeFileWithAI(filePath: string, code: string, apiKey: string): Promise<TranslationIssue[]> {
  try {
    const systemPrompt = `Tu es un expert en internationalisation React/TypeScript. Analyse ce code et détecte TOUS les textes hardcodés français ou anglais qui devraient être traduits.

PATTERNS À DÉTECTER (TRÈS IMPORTANT):
1. toast.success("texte"), toast.error("texte"), toast.info("texte"), toast.warning("texte"), toast("texte")
2. <DialogTitle>texte</DialogTitle>, <DialogDescription>texte</DialogDescription>
3. <AlertTitle>texte</AlertTitle>, <AlertDescription>texte</AlertDescription>
4. <AlertDialogTitle>texte</AlertDialogTitle>, <AlertDialogDescription>texte</AlertDialogDescription>
5. Props hardcodées: title="texte", label="texte", placeholder="texte", description="texte", alt="texte"
6. Texte JSX: <Button>texte</Button>, <span>texte</span>, <p>texte</p>, <h1>texte</h1>, <h2>texte</h2>
7. Template literals avec texte humain

NE PAS DÉTECTER:
- Variables déjà traduites: {t.xxx}, {t("key")}, t.namespace.key, tf("key", {...})
- useTranslation() imports et usages corrects
- Console.log, console.error
- Commentaires // ou /* */
- URLs, chemins de fichiers, noms de classes CSS
- Nombres seuls, codes techniques (UUID, etc.)
- Noms de variables, props techniques (className, id, key, ref)

RÉPONDS UNIQUEMENT EN JSON STRICT (pas de texte avant ou après):
{
  "issues": [
    {
      "line": 42,
      "type": "toast|dialog|alert|prop|jsx_text|button",
      "original": "texte original exactement comme dans le code",
      "suggestedKey": "t.toasts.success.dataSaved",
      "suggestedFr": "traduction française",
      "suggestedEn": "english translation",
      "context": "la ligne de code complète"
    }
  ]
}

Si aucun problème trouvé, réponds: { "issues": [] }`;

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
          { role: 'user', content: `Fichier: ${filePath}\n\nCode:\n${code.substring(0, 20000)}` }
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

    if (issues.length > 0) {
      console.log(`[AI] Found ${issues.length} issues in ${filePath}`);
    }
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

// Priority folders/patterns to scan first
const PRIORITY_PATTERNS = [
  'src/pages/',
  'src/components/admin/',
  'src/components/blog/',
  'src/components/seo/',
  'src/components/dashboard/',
  'src/components/integration/',
  'src/hooks/',
];

// Fallback file list when GitHub API fails
const FALLBACK_FILES = [
  'src/pages/Dashboard.tsx',
  'src/pages/Products.tsx',
  'src/pages/Collections.tsx',
  'src/pages/Settings.tsx',
  'src/pages/GoogleAds.tsx',
  'src/components/admin/AutoTranslationScanner.tsx',
  'src/components/admin/EmailInbox.tsx',
  'src/components/admin/GoogleAdsAdmin.tsx',
  'src/components/ads/GoogleAdsCampaigns.tsx',
  'src/components/ads/GoogleAdsOptimization.tsx',
  'src/components/ads/GoogleAdsTracking.tsx',
  'src/components/seo/SeoOptimization.tsx',
  'src/components/seo/GoogleMerchantIntegration.tsx',
  'src/components/blog/ArticleWizard.tsx',
  'src/components/blog/BlogOpportunities.tsx',
];

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

    // Get credentials
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER');
    const GITHUB_REPO = Deno.env.get('GITHUB_REPO');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Diagnostic info for debugging
    const diagnostics = {
      hasToken: !!GITHUB_TOKEN,
      hasOwner: !!GITHUB_OWNER,
      hasRepo: !!GITHUB_REPO,
      owner: GITHUB_OWNER || 'NOT_SET',
      repo: GITHUB_REPO || 'NOT_SET',
    };
    console.log('[scan-repo-translations] Diagnostics:', JSON.stringify(diagnostics));

    // Check if GitHub credentials are properly configured
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      console.error('[scan-repo-translations] GitHub credentials not configured properly');
      return new Response(JSON.stringify({
        error: 'GitHub credentials not configured',
        errorDetails: `Missing: ${!GITHUB_TOKEN ? 'GITHUB_TOKEN ' : ''}${!GITHUB_OWNER ? 'GITHUB_OWNER ' : ''}${!GITHUB_REPO ? 'GITHUB_REPO' : ''}`.trim(),
        diagnostics,
        totalFiles: 0,
        filesScanned: 0,
        filesWithIssues: 0,
        totalIssues: 0,
        issuesByType: { toast: 0, dialog: 0, alert: 0, prop: 0, jsx_text: 0, button: 0 },
        issues: [],
        aggregatedTranslations: { fr: {}, en: {} },
        suggestion: 'Use batch scan mode instead - paste code directly'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[GitHub] Owner: ${GITHUB_OWNER}, Repo: ${GITHUB_REPO}`);
    console.log('[GitHub] Listing all files from repository...');
    
    const allRepoFiles = await listRepoFiles(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);
    
    if (allRepoFiles.length === 0) {
      console.error('[scan-repo-translations] GitHub returned 0 files - check credentials and repo access');
      return new Response(JSON.stringify({
        error: 'GitHub returned no files',
        errorDetails: 'Could not list repository files. Check that GITHUB_TOKEN has read access to the repository.',
        diagnostics,
        totalFiles: 0,
        filesScanned: 0,
        filesWithIssues: 0,
        totalIssues: 0,
        issuesByType: { toast: 0, dialog: 0, alert: 0, prop: 0, jsx_text: 0, button: 0 },
        issues: [],
        aggregatedTranslations: { fr: {}, en: {} },
        suggestion: 'Use batch scan mode instead - paste code directly'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Sort files: priority patterns first
    const sortedFiles = allRepoFiles.sort((a, b) => {
      const aPriority = PRIORITY_PATTERNS.findIndex(p => a.startsWith(p));
      const bPriority = PRIORITY_PATTERNS.findIndex(p => b.startsWith(p));
      
      const aScore = aPriority === -1 ? 100 : aPriority;
      const bScore = bPriority === -1 ? 100 : bPriority;
      
      return aScore - bScore;
    });

    const maxFiles = body.maxFiles || 30;
    const limitedFiles = sortedFiles.slice(0, maxFiles);

    console.log(`[scan-repo-translations] Will scan ${limitedFiles.length} of ${allRepoFiles.length} files...`);
    console.log(`[scan-repo-translations] First files: ${limitedFiles.slice(0, 5).join(', ')}`);

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
    let fetchErrors = 0;

    // Process files in batches of 3 for better performance
    const batchSize = 3;
    
    for (let i = 0; i < limitedFiles.length; i += batchSize) {
      const batch = limitedFiles.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (filePath: string) => {
        const content = await fetchFileFromGitHub(filePath, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);
        if (!content) {
          console.log(`[GitHub] Skipping ${filePath} - could not fetch`);
          fetchErrors++;
          return { filePath, issues: [] };
        }
        
        filesScanned++;
        console.log(`[Scan] Analyzing ${filePath} (${content.length} chars)`);
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
      totalFiles: allRepoFiles.length,
      filesScanned,
      filesWithIssues,
      totalIssues: allIssues.length,
      issuesByType,
      issues: allIssues,
      aggregatedTranslations
    };

    console.log(`[scan-repo-translations] Scan complete: ${result.totalIssues} issues found in ${filesWithIssues} files (${fetchErrors} fetch errors)`);

    return new Response(JSON.stringify({
      ...result,
      diagnostics,
      fetchErrors,
    }), {
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
      issuesByType: { toast: 0, dialog: 0, alert: 0, prop: 0, jsx_text: 0, button: 0 },
      issues: [],
      aggregatedTranslations: { fr: {}, en: {} }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
