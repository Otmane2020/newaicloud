import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Health check
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, fileName } = body;

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert translation analyzer for React/TypeScript applications.
Your task is to find ALL hardcoded text strings in UI components that should be translated.

DETECT these patterns:
1. toast.success("text"), toast.error("text"), toast.info("text"), toast.warning("text")
2. <DialogTitle>text</DialogTitle>, <AlertDialogTitle>text</AlertDialogTitle>
3. <DialogDescription>text</DialogDescription>, <AlertDialogDescription>text</AlertDialogDescription>
4. <Button>text</Button>, <button>text</button>
5. Props: title="text", label="text", placeholder="text", description="text", alt="text"
6. JSX text content: >text< (especially with accents or common words)
7. Error messages: throw new Error("text"), console.error("text")
8. Alert/notification content

LANGUAGE DETECTION:
- French indicators: à, â, é, è, ê, ë, î, ï, ô, û, ù, ç, œ, and words like "le", "la", "les", "un", "une", "de", "du", "des", "et", "ou", "pour", "avec", "dans", "sur", "par", "est", "sont", "avoir", "être", "faire", "aller", "voir", "pouvoir", "vouloir", "savoir", "falloir", "devoir"
- English indicators: "the", "a", "an", "is", "are", "was", "were", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "can", "may", "might", "must", "shall"
- Mixed: contains both French and English indicators

IGNORE:
- Text already wrapped in {t.xxx} or {tf(...)}
- Import statements
- Comments
- Variable names, function names
- URLs, file paths
- Technical strings (CSS classes, IDs)
- Numbers only
- Single characters
- Code syntax (return, export, const, etc.)

OUTPUT FORMAT (JSON):
{
  "issues": [
    {
      "type": "toast|dialog|button|prop|jsx_text|error|alert",
      "text": "the hardcoded text found",
      "line": 42,
      "detectedLanguage": "fr|en|mixed|unknown",
      "suggestedKey": "toasts.success.operationComplete",
      "suggestedFr": "French translation",
      "suggestedEn": "English translation",
      "fix": "toast.success(t.toasts.success.operationComplete)",
      "context": "brief context of where it was found"
    }
  ],
  "summary": {
    "total": 5,
    "fr": 3,
    "en": 1,
    "mixed": 1
  }
}

KEY NAMING CONVENTIONS:
- toasts.success.xxx, toasts.error.xxx for toast messages
- dialogs.titles.xxx, dialogs.descriptions.xxx for dialog content
- buttons.xxx for button text
- forms.labels.xxx, forms.placeholders.xxx for form props
- common.xxx for general UI text
- errors.xxx for error messages

Be thorough but accurate. Only flag actual hardcoded user-facing strings.`;

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
          { 
            role: "user", 
            content: `Analyze this code for hardcoded text that needs translation:\n\nFile: ${fileName || "unknown"}\n\n\`\`\`tsx\n${code}\n\`\`\`` 
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let result;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { issues: [], summary: { total: 0, fr: 0, en: 0, mixed: 0 } };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      result = { issues: [], summary: { total: 0, fr: 0, en: 0, mixed: 0 } };
    }

    // Generate corrected code
    let correctedCode = code;
    const issues = result.issues || [];
    
    // Sort by line number descending to avoid position shifts when replacing
    const sortedIssues = [...issues].sort((a, b) => (b.line || 0) - (a.line || 0));
    
    for (const issue of sortedIssues) {
      if (issue.text && issue.fix) {
        // Simple replacement - in real scenario, would need more sophisticated approach
        const escapedText = issue.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`["'\`]${escapedText}["'\`]`, 'g');
        correctedCode = correctedCode.replace(regex, issue.fix.includes('(') ? issue.fix.split('(')[1]?.replace(')', '') || `t.${issue.suggestedKey}` : `{t.${issue.suggestedKey}}`);
      }
    }

    // Build translations objects
    const translationsFr: Record<string, any> = {};
    const translationsEn: Record<string, any> = {};

    for (const issue of issues) {
      if (issue.suggestedKey) {
        const parts = issue.suggestedKey.split('.');
        let currentFr = translationsFr;
        let currentEn = translationsEn;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (!currentFr[parts[i]]) currentFr[parts[i]] = {};
          if (!currentEn[parts[i]]) currentEn[parts[i]] = {};
          currentFr = currentFr[parts[i]];
          currentEn = currentEn[parts[i]];
        }
        
        currentFr[parts[parts.length - 1]] = issue.suggestedFr || issue.text;
        currentEn[parts[parts.length - 1]] = issue.suggestedEn || issue.text;
      }
    }

    return new Response(
      JSON.stringify({
        issues,
        summary: result.summary || { 
          total: issues.length, 
          fr: issues.filter((i: DetectedIssue) => i.detectedLanguage === 'fr').length,
          en: issues.filter((i: DetectedIssue) => i.detectedLanguage === 'en').length,
          mixed: issues.filter((i: DetectedIssue) => i.detectedLanguage === 'mixed').length
        },
        correctedCode,
        translationsFr,
        translationsEn,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("scan-translation-issues error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
