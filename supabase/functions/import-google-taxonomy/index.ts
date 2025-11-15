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

    const { taxonomyData } = await req.json();

    if (!taxonomyData || !Array.isArray(taxonomyData)) {
      throw new Error("Invalid taxonomy data format");
    }

    console.log(`📦 Importing ${taxonomyData.length} taxonomy entries...`);

    // Parse and structure the data
    const structuredData = taxonomyData.map((line: string) => {
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

    // Clear existing data
    console.log("🗑️ Clearing existing taxonomy data...");
    const { error: deleteError } = await supabase
      .from("google_product_taxonomy")
      .delete()
      .neq("id", 0);

    if (deleteError) {
      console.error("Error clearing data:", deleteError);
    }

    // Insert in batches of 1000
    const batchSize = 1000;
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
      console.log(`✅ Inserted ${inserted}/${structuredData.length}`);
    }

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
