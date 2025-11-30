import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranslationIssue {
  type: string;
  text: string;
  line: number;
  detectedLanguage: string;
  suggestedKey: string;
  suggestedFr: string;
  suggestedEn: string;
  fix: string;
  context: string;
}

interface FileAnalysis {
  filePath: string;
  issues: TranslationIssue[];
  correctedCode: string;
  translationsFr: Record<string, unknown>;
  translationsEn: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  try {
    const body = await req.json();
    if (body?.healthCheck) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { codes, action } = body;
    
    if (!codes || !Array.isArray(codes)) {
      throw new Error("codes array is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const allResults: FileAnalysis[] = [];
    const aggregatedFr: Record<string, unknown> = {};
    const aggregatedEn: Record<string, unknown> = {};

    // Process each file
    for (const { filePath, code } of codes) {
      if (!code || code.trim().length < 10) continue;

      console.log(`[auto-fix-translations] Analyzing: ${filePath}`);

      const systemPrompt = `Tu es un expert en internationalisation React/TypeScript. Analyse le code et détecte TOUS les textes hardcodés qui doivent être traduits.

DÉTECTE ces patterns:
1. toast.success("texte"), toast.error("texte"), toast({ title: "texte" })
2. <DialogTitle>texte</DialogTitle>, <DialogDescription>texte</DialogDescription>
3. <AlertTitle>texte</AlertTitle>, <AlertDescription>texte</AlertDescription>
4. title="texte", label="texte", placeholder="texte", description="texte"
5. <Button>texte</Button>, <span>texte</span>, <p>texte</p> avec du texte statique
6. new Error("texte")

IGNORE:
- Les textes déjà traduits: {t.xxx}, t("xxx"), tf("xxx")
- Les variables: {variable}
- Les classes CSS, IDs, attributs techniques

RÉPONDS en JSON valide:
{
  "issues": [
    {
      "type": "toast|dialog|alert|prop|jsx_text|button|error",
      "text": "texte original",
      "line": numero_ligne,
      "detectedLanguage": "fr|en|mixed",
      "suggestedKey": "section.subsection.key_name",
      "suggestedFr": "traduction française",
      "suggestedEn": "english translation",
      "fix": "code corrigé avec {t.section.subsection.key_name}",
      "context": "ligne de code originale"
    }
  ],
  "translationsFr": { "section": { "subsection": { "key_name": "valeur FR" } } },
  "translationsEn": { "section": { "subsection": { "key_name": "valeur EN" } } },
  "correctedCode": "// Code complet corrigé avec toutes les traductions"
}`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Fichier: ${filePath}\n\nCode:\n${code.substring(0, 15000)}` }
            ],
            temperature: 0,
          }),
        });

        if (!response.ok) {
          console.error(`[auto-fix-translations] API error for ${filePath}:`, response.status);
          continue;
        }

        const aiResponse = await response.json();
        let content = aiResponse.choices?.[0]?.message?.content || "";
        
        // Clean JSON
        content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        
        const parsed = JSON.parse(content);
        
        allResults.push({
          filePath,
          issues: parsed.issues || [],
          correctedCode: parsed.correctedCode || "",
          translationsFr: parsed.translationsFr || {},
          translationsEn: parsed.translationsEn || {},
        });

        // Merge translations
        deepMerge(aggregatedFr, parsed.translationsFr || {});
        deepMerge(aggregatedEn, parsed.translationsEn || {});

      } catch (parseError) {
        console.error(`[auto-fix-translations] Parse error for ${filePath}:`, parseError);
      }
    }

    // Calculate stats
    const totalIssues = allResults.reduce((sum, r) => sum + r.issues.length, 0);
    const issuesByType = {
      toast: 0,
      dialog: 0,
      alert: 0,
      prop: 0,
      jsx_text: 0,
      button: 0,
      error: 0,
    };

    allResults.forEach(r => {
      r.issues.forEach(issue => {
        if (issue.type in issuesByType) {
          issuesByType[issue.type as keyof typeof issuesByType]++;
        }
      });
    });

    return new Response(
      JSON.stringify({
        success: true,
        filesAnalyzed: allResults.length,
        totalIssues,
        issuesByType,
        results: allResults,
        aggregatedTranslations: {
          fr: aggregatedFr,
          en: aggregatedEn,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[auto-fix-translations] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      target[key] = source[key];
    }
  }
}
