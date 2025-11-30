import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { filePath } = body;

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "filePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GitHub repo details - can be configured via env vars
    const GITHUB_OWNER = Deno.env.get("GITHUB_OWNER") || "GPT-Engineer-App";
    const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "newai-seo-shopify-optimizer";
    const GITHUB_BRANCH = Deno.env.get("GITHUB_BRANCH") || "main";
    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN"); // Optional for private repos

    // Try raw.githubusercontent.com first (faster, works for public repos)
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
    
    console.log(`Fetching file from: ${rawUrl}`);

    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3.raw",
      "User-Agent": "Lovable-Translation-Scanner",
    };

    if (GITHUB_TOKEN) {
      headers["Authorization"] = `token ${GITHUB_TOKEN}`;
    }

    const response = await fetch(rawUrl, { headers });

    if (!response.ok) {
      // Try GitHub API as fallback
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
      
      console.log(`Raw fetch failed, trying API: ${apiUrl}`);
      
      const apiResponse = await fetch(apiUrl, { headers });
      
      if (!apiResponse.ok) {
        console.error(`GitHub API error: ${apiResponse.status}`);
        return new Response(
          JSON.stringify({ 
            error: `File not found: ${filePath}`,
            status: apiResponse.status,
            hint: "Vérifiez que le fichier existe et que le repo est accessible"
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await apiResponse.json();
      
      if (data.content) {
        // Content is base64 encoded
        const content = atob(data.content.replace(/\n/g, ""));
        return new Response(
          JSON.stringify({ content, filePath, source: "github_api" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const content = await response.text();

    return new Response(
      JSON.stringify({ content, filePath, source: "raw_github" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-file-content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
