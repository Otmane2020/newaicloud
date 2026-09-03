from pathlib import Path

edge_path = Path("supabase/functions/generate-white-background/index.ts")
edge = edge_path.read_text(encoding="utf-8")

helper = '''async function prepareProviderSource(payload: ImagePayload): Promise<ImagePayload> {
  const MAX_DIMENSION = 1024;
  const MAX_SOURCE_BYTES = 4 * 1024 * 1024;

  if (payload.bytes.length <= MAX_SOURCE_BYTES) {
    try {
      const probe = await Image.decode(payload.bytes);
      if (Math.max(probe.width, probe.height) <= MAX_DIMENSION) return payload;
    } catch {
      return payload;
    }
  }

  try {
    const source = await Image.decode(payload.bytes);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const resized = source.resize(width, height);
    const bytes = await resized.encode();
    console.log("[white-bg] Prepared provider source", {
      originalBytes: payload.bytes.length,
      preparedBytes: bytes.length,
      width,
      height,
    });
    return { bytes, mimeType: "image/png" };
  } catch (error) {
    console.warn("[white-bg] Source normalization failed; using original image", error);
    return payload;
  }
}

'''

marker = "async function enforceImageFormat("
if "async function prepareProviderSource(" not in edge:
    if marker not in edge:
        raise SystemExit("Edge helper insertion marker not found")
    edge = edge.replace(marker, helper + marker, 1)

old_source = "    const source = await fetchImagePayload(imageUrl);\n    const prompt = buildPrompt(body, format);"
new_source = "    const source = await fetchImagePayload(imageUrl);\n    const providerSource = await prepareProviderSource(source);\n    const prompt = buildPrompt(body, format);"
if old_source in edge:
    edge = edge.replace(old_source, new_source, 1)
elif "const providerSource = await prepareProviderSource(source);" not in edge:
    raise SystemExit("Provider source insertion point not found")

old_provider_payload = "      imageBytes: source.bytes,\n      mimeType: source.mimeType,"
new_provider_payload = "      imageBytes: providerSource.bytes,\n      mimeType: providerSource.mimeType,"
if old_provider_payload in edge:
    edge = edge.replace(old_provider_payload, new_provider_payload, 1)
elif new_provider_payload not in edge:
    raise SystemExit("Provider payload not found")

old_openai = "if (!result) result = await tryOpenAI(prompt, source, format);"
new_openai = "if (!result) result = await tryOpenAI(prompt, providerSource, format);"
if old_openai in edge:
    edge = edge.replace(old_openai, new_openai, 1)
elif new_openai not in edge:
    raise SystemExit("OpenAI fallback line not found")

old_failure = '''      return jsonResponse(503, {
        success: false,
        error: "ALL_PROVIDERS_FAILED",
        message: "All configured AI image providers failed",
      });'''
new_failure = '''      return jsonResponse(200, {
        success: false,
        error: "ALL_PROVIDERS_FAILED",
        message: "AI image providers are temporarily unavailable. Please try again.",
        retryable: true,
      });'''
if old_failure in edge:
    edge = edge.replace(old_failure, new_failure, 1)
elif "retryable: true" not in edge:
    raise SystemExit("Provider failure block not found")

edge = edge.replace("version: 3", "version: 4", 1)
edge_path.write_text(edge, encoding="utf-8")

ui_path = Path("src/pages/ProductTitleDescription.tsx")
ui = ui_path.read_text(encoding="utf-8")
needle = 'supabase.functions.invoke("generate-white-background"'
positions = []
start = 0
while True:
    pos = ui.find(needle, start)
    if pos < 0:
        break
    positions.append(pos)
    start = pos + len(needle)

if len(positions) != 2:
    raise SystemExit(f"Expected 2 white-background invocations, found {len(positions)}")

offset = 0
patched = 0
for original_pos in positions:
    pos = original_pos + offset
    error_pos = ui.find("if (error) throw error;", pos)
    success_pos = ui.find("if (data.success && data.imageUrl)", error_pos)
    if error_pos < 0 or success_pos < 0 or success_pos - error_pos > 1200:
        raise SystemExit("Could not locate white-background response handling")
    segment = ui[error_pos:success_pos]
    if "if (!data?.success || !data?.imageUrl)" in segment:
        continue
    line_start = ui.rfind("\n", 0, error_pos) + 1
    indent = ui[line_start:error_pos]
    end_stmt = error_pos + len("if (error) throw error;")
    insertion = (
        "\n\n" + indent + "if (!data?.success || !data?.imageUrl) {\n"
        + indent + "  throw new Error(data?.message || (language === \"fr\"\n"
        + indent + "    ? \"Les fournisseurs d’images IA sont temporairement indisponibles. Réessayez dans quelques instants.\"\n"
        + indent + "    : \"AI image providers are temporarily unavailable. Please try again shortly.\"));\n"
        + indent + "}"
    )
    ui = ui[:end_stmt] + insertion + ui[end_stmt:]
    offset += len(insertion)
    patched += 1

if patched != 2 and "Les fournisseurs d’images IA sont temporairement indisponibles" not in ui:
    raise SystemExit(f"Expected to patch 2 frontend calls, patched {patched}")

ui_path.write_text(ui, encoding="utf-8")
print(f"Patched edge function and {patched} frontend white-background calls")
