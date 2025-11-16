import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    console.log("🔄 Starting Google Product Taxonomy import...");

    // Check if table already has data
    const { count } = await supabase
      .from("google_product_taxonomy")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      console.log(`⚠️ Table already contains ${count} entries. Clearing...`);
      // Clear existing data
      await supabase
        .from("google_product_taxonomy")
        .delete()
        .neq("id", 0);
    }

    // Download taxonomy from Google (French version)
    console.log("📥 Downloading taxonomy from Google...");
    const response = await fetch(
      "https://www.google.com/basepages/producttype/taxonomy-with-ids.fr-FR.txt"
    );

    if (!response.ok) {
      throw new Error(`Failed to download taxonomy: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split("\n").filter(line => line.trim() && !line.startsWith("#"));

    console.log(`📊 Processing ${lines.length} taxonomy entries...`);

    // Parse and structure the data
    const structuredData = lines.map((line: string) => {
      // Format: "id - full path"
      const match = line.match(/^(\d+)\s*-\s*(.+)$/);
      if (!match) return null;

      const id = parseInt(match[1]);
      const fullPath = match[2].trim();
      const parts = fullPath.split(" > ");

      return {
        id,
        full_path: fullPath,
        level1: parts[0] || null,
        level2: parts[1] || null,
        level3: parts[2] || null,
        level4: parts[3] || null,
        level5: parts[4] || null,
        depth: parts.length,
      };
    }).filter(Boolean);

    console.log(`✅ Parsed ${structuredData.length} valid entries`);

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < structuredData.length; i += batchSize) {
      const batch = structuredData.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from("google_product_taxonomy")
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        throw insertError;
      }

      inserted += batch.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1}: ${inserted}/${structuredData.length}`);
    }

    console.log(`🎉 Import complete! Inserted ${inserted} entries`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: inserted,
        message: `Successfully imported ${inserted} taxonomy entries`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
