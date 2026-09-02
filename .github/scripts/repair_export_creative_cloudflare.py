from pathlib import Path

path = Path('supabase/functions/export-creative-image/index.ts')
t = path.read_text()
start_marker = '    const cloudflareDimensions: Record<string, { width: number; height: number }> = {'
start = t.find(start_marker)
if start < 0:
    raise RuntimeError('Cloudflare block start not found')

# The real handler catch is the LAST top-level catch in this file. Earlier catches belong to legacy nested loops.
end_marker = '  } catch (error: any) {'
end = t.rfind(end_marker)
if end < 0 or end <= start:
    raise RuntimeError('Outer handler catch not found')

clean_block = '''    const cloudflareDimensions: Record<string, { width: number; height: number }> = {
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

path.write_text(t[:start] + clean_block + t[end:])
print('Cleaned export-creative-image handler tail')
