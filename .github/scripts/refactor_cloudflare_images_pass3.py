from pathlib import Path

ROOT = Path('.')

# 1) Repair export-creative-image deterministically: replace the entire legacy model loop.
path = ROOT / 'supabase/functions/export-creative-image/index.ts'
t = path.read_text()
start_marker = '    const configuredModel = Deno.env.get("LOVABLE_IMAGE_MODEL")?.trim();'
end_marker = '  } catch (error: any) {'
start = t.find(start_marker)
if start < 0:
    raise RuntimeError('export-creative-image legacy model block start not found')
end = t.find(end_marker, start)
if end < 0:
    raise RuntimeError('export-creative-image catch marker not found')

cloudflare_block = '''    const cloudflareDimensions: Record<string, { width: number; height: number }> = {
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
    });
'''
t = t[:start] + cloudflare_block + t[end:]
path.write_text(t)
print('Repaired', path)

# 2) Update stale frontend history/metadata labels so generated images are recorded as Cloudflare.
metadata_files = [
    ROOT / 'src/pages/ProductTitleDescription.tsx',
    ROOT / 'src/components/seo/SmartBackgroundDialog.tsx',
    ROOT / 'src/components/seo/ProductContentOptimization.tsx',
]
for path in metadata_files:
    text = path.read_text()
    old = text
    text = text.replace('"gemini-2.5-flash-image-preview"', '"@cf/stabilityai/stable-diffusion-xl-base-1.0"')
    text = text.replace("'gemini-2.5-flash-image-preview'", "'@cf/stabilityai/stable-diffusion-xl-base-1.0'")
    if text != old:
        path.write_text(text)
        print('Updated metadata', path)

# 3) The landing function uses Gemini only for vision/JSON analysis. Explicitly request text output only.
path = ROOT / 'supabase/functions/generate-landing-deepseek/index.ts'
text = path.read_text()
old = text
text = text.replace('modalities: ["image", "text"],\n        temperature: 0.1,', 'modalities: ["text"],\n        temperature: 0.1,', 1)
if text != old:
    path.write_text(text)
    print('Made vision output text-only', path)
