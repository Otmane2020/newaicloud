from pathlib import Path
import re

ROOT = Path("supabase/functions")
CF_IMPORT = 'import { generateCloudflareImage } from "../_shared/cloudflare-image.ts";'
changed = []


def load(rel: str) -> str:
    return (ROOT / rel / "index.ts").read_text()


def save(rel: str, text: str) -> None:
    path = ROOT / rel / "index.ts"
    old = path.read_text()
    if text != old:
        path.write_text(text)
        changed.append(str(path))


def add_import(text: str) -> str:
    if CF_IMPORT in text:
        return text
    marker = 'import { serve } from "https://deno.land/std@0.168.0/http/server.ts";'
    if marker not in text:
        raise RuntimeError("serve import marker not found")
    return text.replace(marker, marker + "\n" + CF_IMPORT, 1)


def sub1(text: str, pattern: str, repl: str, label: str, flags=re.S | re.M) -> str:
    new, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n != 1:
        raise RuntimeError(f"{label}: expected 1 replacement, got {n}")
    return new


lovable_key_pattern = r'\n    const LOVABLE_API_KEY = Deno\.env\.get\("LOVABLE_API_KEY"\);\n    if \(!LOVABLE_API_KEY\) \{\n(?:.*?\n)*?    \}\n'

# 1) AI product background: Cloudflare already exists; remove Gemini/Lovable image fallback.
rel = "generate-ai-product-background"
t = load(rel)
t = re.sub(lovable_key_pattern, "\n", t, count=1, flags=re.M)
t = sub1(
    t,
    r'\n    // Helper function to try Lovable AI.*?(?=\n    // Cloudflare Workers AI img2img\.)',
    "\n",
    rel + " remove Lovable Gemini helper",
)
t = sub1(
    t,
    r"    // Prefer Cloudflare's low/zero-cost route, then use Gemini image editing\.\n    const cloudflareResult = await tryCloudflareAI\(\);\n    const result = cloudflareResult\?\.imageUrl \? cloudflareResult : await tryLovableAI\(\);",
    '    // Cloudflare is the image-generation provider for this path.\n    const result = await tryCloudflareAI();',
    rel + " provider chain",
)
t = t.replace("Ajoutez des crédits à votre workspace Lovable AI", "Vérifiez la configuration Cloudflare Workers AI")
save(rel, t)

# 2) White Background: Cloudflare first, OpenAI remains non-Gemini fallback.
rel = "generate-white-background"
t = add_import(load(rel))
t = sub1(
    t,
    r'\nasync function tryGeminiDirect\(.*?(?=\nasync function tryOpenAI\()',
    "\n",
    rel + " remove Gemini/Lovable providers",
)
t = sub1(
    t,
    r'    let result = await tryGeminiDirect\(prompt, source, galleryImages\);\n    if \(!result\) result = await tryLovableAI\(prompt, imageUrl, galleryImages\);\n    if \(!result\) result = await tryOpenAI\(prompt, source, format\);',
    '''    let result: ProviderResult | null = await generateCloudflareImage({
      prompt,
      imageBytes: source.bytes,
      mimeType: source.mimeType,
      width: formatDimensions[format].width,
      height: formatDimensions[format].height,
      strength: 0.28,
    });
    if (!result) result = await tryOpenAI(prompt, source, format);''',
    rel + " provider chain",
)
t = t.replace(
    'if (body?.healthCheck === true) return jsonResponse(200, { ok: true, version: 2 });',
    'if (body?.healthCheck === true) return jsonResponse(200, { ok: true, version: 3 });',
)
save(rel, t)

# 3) AI Background Variants: use Cloudflare img2img for every variant.
rel = "generate-ai-background-variants"
t = add_import(load(rel))
t = re.sub(lovable_key_pattern, "\n", t, count=1, flags=re.M)
t = sub1(
    t,
    r'          const res = await fetch\("https://ai\.gateway\.lovable\.dev/v1/chat/completions", \{.*?          const qualityScore =',
    '''          const generated = await generateCloudflareImage({
            prompt: variant.prompt,
            imageUrl: productImageUrl,
            width: 1024,
            height: 1024,
            strength: 0.28,
          });

          if (!generated?.imageUrl) {
            console.error(`Cloudflare image generation failed for ${variant.style}`);
            return null;
          }

          const imageUrl = generated.imageUrl;
          const base64 = imageUrl.includes(",") ? imageUrl.split(",")[1] : "";
          if (!base64) {
            console.error(`Cloudflare returned an unsupported image payload for ${variant.style}`);
            return null;
          }

          const qualityScore =''',
    rel + " generation block",
)
save(rel, t)

# 4) Product Shot AI: primary reference becomes Cloudflare img2img source.
rel = "generate-ai-product-images"
t = add_import(load(rel))
t = re.sub(lovable_key_pattern, "\n", t, count=1, flags=re.M)
t = sub1(
    t,
    r'    const callImageModel = async \(prompt: string\) => \{.*?^    \};$',
    '''    const callImageModel = async (prompt: string, landscape = false) => {
      const generated = await generateCloudflareImage({
        prompt,
        imageUrl: sourceImageUrl,
        width: landscape ? 1344 : 1024,
        height: landscape ? 768 : 1024,
        strength: 0.28,
      });
      if (!generated?.imageUrl) {
        throw new Error("Cloudflare image generation failed");
      }
      console.log(`[Product Shot AI] Cloudflare used primary reference; ${Math.max(0, references.length - 1)} secondary reference(s) kept as context only.`);
      return generated.imageUrl;
    };''',
    rel + " callImageModel",
)
marker = "    if (includeDecor) {"
pos = t.find(marker)
if pos < 0:
    raise RuntimeError(rel + ": includeDecor marker missing")
before, after = t[:pos], t[pos:]
if 'const imageUrl = await callImageModel(prompt);' not in after:
    raise RuntimeError(rel + ": decor call marker missing")
after = after.replace(
    'const imageUrl = await callImageModel(prompt);',
    'const imageUrl = await callImageModel(prompt, true);',
    1,
)
t = before + after
save(rel, t)

# 5) Generic image-background: Cloudflare -> OpenAI fallback.
rel = "generate-image-background"
t = add_import(load(rel))
t = re.sub(lovable_key_pattern, "\n", t, count=1, flags=re.M)
t = sub1(
    t,
    r'\n    // Helper function to try Lovable AI with format-aware generation\n.*?(?=\n    // Helper function to try OpenAI DALL-E)',
    '''
    // Cloudflare Workers AI image editing.
    async function tryCloudflareAI(): Promise<{ imageUrl: string; model: string } | null> {
      const generated = await generateCloudflareImage({
        prompt: photographyPrompt,
        imageUrl,
        width: targetDims.width,
        height: targetDims.height,
        strength: 0.28,
      });
      return generated ? { imageUrl: generated.imageUrl, model: `${generated.model} (Cloudflare Workers AI)` } : null;
    }
''',
    rel + " Cloudflare helper",
)
t = sub1(
    t,
    r'    // Try providers in order: Lovable AI → OpenAI\n    let result = await tryLovableAI\(\);\n\n    if \(!result\) \{\n      console\.log\("🔄 Lovable AI failed, trying OpenAI\.\.\."\);\n      result = await tryOpenAI\(\);\n    \}',
    '''    // Try providers in order: Cloudflare Workers AI → OpenAI.
    let result = await tryCloudflareAI();

    if (!result) {
      console.log("Cloudflare failed, trying OpenAI image fallback...");
      result = await tryOpenAI();
    }''',
    rel + " provider chain",
)
save(rel, t)

# 6) Product background: replace Lovable + direct Gemini fallback with Cloudflare.
rel = "generate-product-background"
t = add_import(load(rel))
t = re.sub(lovable_key_pattern, "\n", t, count=1, flags=re.M)
t = sub1(
    t,
    r'    // Call Lovable AI\n.*?(?=    // 🆕 POST-PROCESSING: Force exact format dimensions)',
    '''    // Cloudflare Workers AI image editing.
    const cloudflareResult = await generateCloudflareImage({
      prompt: contextualPrompt,
      imageUrl,
      width: targetDims.width,
      height: targetDims.height,
      strength: 0.28,
    });

    if (!cloudflareResult?.imageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "CLOUDFLARE_IMAGE_GENERATION_FAILED",
          message: "Cloudflare Workers AI image generation failed or is not configured.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const generatedImageUrl = cloudflareResult.imageUrl;
    const usedModel = `${cloudflareResult.model} (Cloudflare Workers AI)`;
    console.log(`Background generated successfully via ${usedModel}`);

''',
    rel + " provider block",
)
t = t.replace('model: "google/gemini-2.5-flash-image-preview",', 'model: usedModel,')
t = t.replace(
    'suggestion: "Try with a higher-quality product photo or check your Lovable AI credits."',
    'suggestion: "Try with a higher-quality product photo or verify Cloudflare Workers AI configuration."',
)
save(rel, t)

# 7) Generic text-to-image generator: Cloudflare text-to-image.
rel = "generate-image"
t = add_import(load(rel))
t = re.sub(lovable_key_pattern, "\n", t, count=1, flags=re.M)
t = sub1(
    t,
    r'    // --- LOVABLE AI IMAGE GENERATION ---\n.*?(?=    // Extract base64 from data URL \(format: data:image/png;base64,\.\.\.\))',
    '''    // --- CLOUDFLARE WORKERS AI IMAGE GENERATION ---
    const targetDims = isArticle ? { width: 1344, height: 768 } : { width: 1024, height: 1024 };
    const generated = await generateCloudflareImage({
      prompt: enhancedPrompt,
      width: targetDims.width,
      height: targetDims.height,
    });

    if (!generated?.imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Cloudflare Workers AI image generation failed or is not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const imageUrl = generated.imageUrl;

''',
    rel + " provider block",
)
t = t.replace('model: "google/gemini-2.5-flash-image-preview",', 'model: generated.model,')
save(rel, t)

# 8) Nano Banana endpoint keeps its public contract/name but uses Cloudflare.
rel = "generate-nano-banana-image"
t = add_import(load(rel))
t = re.sub(lovable_key_pattern, "\n", t, count=1, flags=re.M)
t = sub1(
    t,
    r'    // Use Lovable AI Gateway with Nano Banana model\n.*?(?=    console\.log\("\[Nano Banana Pro\] Image generated successfully"\);)',
    '''    const dimensions: Record<string, { width: number; height: number }> = {
      "1:1": { width: 1024, height: 1024 },
      "16:9": { width: 1344, height: 768 },
      "9:16": { width: 768, height: 1344 },
      "4:3": { width: 1024, height: 768 },
      "3:4": { width: 768, height: 1024 },
    };
    const dims = dimensions[aspectRatio] || dimensions["16:9"];
    const generated = await generateCloudflareImage({
      prompt: finalPrompt,
      width: dims.width,
      height: dims.height,
    });
    if (!generated?.imageUrl) {
      throw new Error("Cloudflare Workers AI image generation failed or is not configured");
    }
    const imageUrl = generated.imageUrl;

''',
    rel + " provider block",
)
save(rel, t)

print("Changed files:")
for p in changed:
    print(" -", p)

print("\nRemaining Gemini image-generation markers (audit only):")
patterns = re.compile(
    r"gemini-[^\"'\s]*image|google/gemini-[^\"'\s]*image|GEMINI_IMAGE_MODEL|responseModalities\s*:\s*\[[^\]]*IMAGE",
    re.I,
)
leftovers = []
for path in ROOT.rglob("*.ts"):
    for lineno, line in enumerate(path.read_text(errors="ignore").splitlines(), 1):
        if patterns.search(line):
            leftovers.append((path, lineno, line.strip()))

if leftovers:
    for path, lineno, line in leftovers:
        print(f"LEFTOVER {path}:{lineno}: {line[:240]}")
else:
    print("NONE")
