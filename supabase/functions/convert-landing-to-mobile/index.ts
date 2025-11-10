import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { htmlContent } = await req.json();

    if (!htmlContent) {
      throw new Error("HTML content is required");
    }

    console.log("[Mobile] Converting HTML to mobile-responsive...");
    console.log(`[Mobile] Input HTML length: ${htmlContent.length} characters`);

    // 🔹 Post-traitement mobile-responsive
    let mobileHtml = htmlContent;

    // 1. Forcer les images responsive
    mobileHtml = mobileHtml.replace(
      /<img([^>]*?)class="([^"]*?)"/g,
      '<img$1class="$2 w-full h-auto object-cover"'
    );
    console.log("[Mobile] ✓ Images made responsive");

    // 2. Ajouter des breakpoints responsive sur les containers
    mobileHtml = mobileHtml.replace(
      /class="(container|wrapper|section)([^"]*?)"/g,
      'class="$1$2 px-4 sm:px-6 md:px-8"'
    );
    console.log("[Mobile] ✓ Container padding added");

    // 3. Forcer les grids responsive
    mobileHtml = mobileHtml.replace(
      /grid-cols-(\d+)/g,
      'grid-cols-1 sm:grid-cols-2 md:grid-cols-$1'
    );
    console.log("[Mobile] ✓ Grid layouts made responsive");

    // 4. Adapter les text sizes pour mobile
    mobileHtml = mobileHtml.replace(
      /text-(\d+xl)/g,
      (match, size) => {
        const mobileMap: { [key: string]: string } = {
          '5xl': 'text-3xl sm:text-4xl md:text-5xl',
          '4xl': 'text-2xl sm:text-3xl md:text-4xl',
          '3xl': 'text-xl sm:text-2xl md:text-3xl',
          '2xl': 'text-lg sm:text-xl md:text-2xl',
        };
        return mobileMap[size] || match;
      }
    );
    console.log("[Mobile] ✓ Text sizes adapted");

    // 5. Adapter les paddings/margins pour mobile
    mobileHtml = mobileHtml.replace(
      /py-(\d{2,})/g,
      (match, size) => {
        const numSize = parseInt(size);
        if (numSize > 12) {
          return `py-${Math.max(6, Math.floor(numSize / 2))} sm:py-${size}`;
        }
        return match;
      }
    );
    console.log("[Mobile] ✓ Padding adapted");

    // 6. Ajouter un meta viewport si absent
    if (!mobileHtml.includes('<meta name="viewport"')) {
      mobileHtml = mobileHtml.replace(
        /<head>/i,
        '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
      console.log("[Mobile] ✓ Viewport meta tag added");
    }

    // 7. Forcer max-width sur les conteneurs principaux
    mobileHtml = mobileHtml.replace(
      /<div class="(w-full[^"]*?)"/g,
      '<div class="$1 max-w-7xl mx-auto"'
    );
    console.log("[Mobile] ✓ Max-width constraints added");

    // 8. Améliorer les gaps pour mobile
    mobileHtml = mobileHtml.replace(
      /gap-(\d+)/g,
      (match, size) => {
        const numSize = parseInt(size);
        if (numSize > 6) {
          return `gap-4 sm:gap-${size}`;
        }
        return match;
      }
    );
    console.log("[Mobile] ✓ Gap spacing optimized");

    console.log("✅ Mobile conversion completed");
    console.log(`✅ Output HTML length: ${mobileHtml.length} characters`);

    return new Response(
      JSON.stringify({
        success: true,
        mobileHtml,
        optimizations: [
          "Responsive images",
          "Mobile-first grid",
          "Adaptive text sizes",
          "Mobile padding/margin",
          "Viewport meta tag",
          "Container max-width",
          "Gap spacing",
        ],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Mobile conversion error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
