from pathlib import Path
import re

ROOT = Path("supabase/functions")
CF_IMPORT = 'import { generateCloudflareImage } from "../_shared/cloudflare-image.ts";'
changed = []


def sub1(text: str, pattern: str, repl: str, label: str, flags=re.S | re.M) -> str:
    result, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 replacement, got {count}")
    return result


def add_import_after(text: str, marker: str) -> str:
    if CF_IMPORT in text:
        return text
    if marker not in text:
        raise RuntimeError(f"import marker not found: {marker}")
    return text.replace(marker, marker + "\n" + CF_IMPORT, 1)


def save(path: Path, text: str) -> None:
    old = path.read_text()
    if old != text:
        path.write_text(text)
        changed.append(str(path))


# Blog featured image: keep Lovable for article TEXT, move only image generation to Cloudflare.
path = ROOT / "generate-blog-article" / "index.ts"
t = path.read_text()
t = add_import_after(
    t,
    'import { resolveLanguage, getLanguageInstructions, getLanguageName, getGenerationLanguage } from "../_shared/language-detector.ts";',
)
t = sub1(
    t,
    r'    // Étape 4: Générer l\'image de couverture avec Lovable AI\n.*?(?=    // Étape 5:)',
    '''    // Étape 4: Générer l'image de couverture avec Cloudflare Workers AI
    let featuredImage = "";
    if (generateFeaturedImage) {
      try {
        console.log("Generating featured image with Cloudflare Workers AI...");

        const imagePrompt = `Créez une image de couverture moderne et professionnelle pour un article sur "${articleTitle}".
Style: photographie de haute qualité, minimaliste, épurée, professionnelle.
Thème: ${category} - ${keywords.slice(0, 3).join(', ')}
Couleurs: harmonieuses et élégantes.
Format: 1200x630px (format Open Graph).
Aucun texte, juste une représentation visuelle du sujet.`;

        const generatedImage = await generateCloudflareImage({
          prompt: imagePrompt,
          width: 1200,
          height: 630,
        });

        if (generatedImage?.imageUrl) {
          featuredImage = generatedImage.imageUrl;
          console.log("Featured image generated with Cloudflare:", generatedImage.model);
        } else {
          console.warn("Cloudflare did not return a featured image");
        }
      } catch (err) {
        console.error("Featured image generation error:", err);
        // Ne pas bloquer la génération d'article si l'image échoue
      }
    }

''',
    "generate-blog-article image block",
)
save(path, t)


# Ad creative export: replace the Lovable Gemini image loop with Cloudflare img2img.
path = ROOT / "export-creative-image" / "index.ts"
t = path.read_text()
t = add_import_after(t, 'import { serve } from "https://deno.land/std@0.168.0/http/server.ts";')
t = sub1(
    t,
    r'\nconst callGateway = async \(\{.*?^\};\n\nserve\(async \(req\) => \{',
    '\nserve(async (req) => {',
    "export-creative-image remove Lovable gateway",
)
t = sub1(
    t,
    r'\n    const LOVABLE_API_KEY = Deno\.env\.get\("LOVABLE_API_KEY"\);\n    if \(!LOVABLE_API_KEY\) throw new Error\("LOVABLE_API_KEY not configured"\);\n',
    '\n',
    "export-creative-image remove Lovable requirement",
)
t = sub1(
    t,
    r'    const configuredModel = Deno\.env\.get\("LOVABLE_IMAGE_MODEL"\)\?\.trim\(\);.*?    throw new Error\(`The available AI image models did not return a valid image\. \$\{attempts\.join\(" \\| "\)\}`\);',
    '''    const cloudflareDimensions: Record<string, { width: number; height: number }> = {
      square: { width: 1024, height: 1024 },
      portrait: { width: 1024, height: 1280 },
      story: { width: 768, height: 1360 },
      landscape: { width: 1344, height: 768 },
    };
    const aiDimensions = cloudflareDimensions[output.id] || cloudflareDimensions.square;

    console.log("Ad creative generation", {
      product: product.title,
      template: template.id,
      size: output.id,
      ratio: output.ratio,
      mode,
      showPrice: Boolean(showPrice),
      provider: "cloudflare-workers-ai",
    });

    const generated = await generateCloudflareImage({
      prompt,
      imageUrl: sourceDataUrl,
      width: aiDimensions.width,
      height: aiDimensions.height,
      strength: 0.28,
      negativePrompt: "different product, altered product shape, wrong color, changed material, added parts, removed parts, fake logo, watermark, gibberish, low quality",
    });

    if (!generated?.imageUrl) {
      throw new Error("Cloudflare Workers AI did not return a valid creative image. Check Cloudflare image credentials and model configuration.");
    }

    const generatedDataUrl = await resolveGeneratedDataUrl(generated.imageUrl);
    const parsed = dataUrlParts(generatedDataUrl);
    if (!parsed) {
      throw new Error("Cloudflare Workers AI returned an unsupported image payload.");
    }

    return new Response(JSON.stringify({
      base64: parsed.base64,
      mimeType: parsed.mimeType,
      outputFormat: output.id,
      ratio: output.ratio,
      dimensions: output.dimensions,
      model: generated.model,
      provider: generated.provider,
      generatedByAI: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });''',
    "export-creative-image model loop",
)
save(path, t)

print("Changed files:")
for item in changed:
    print(" -", item)
