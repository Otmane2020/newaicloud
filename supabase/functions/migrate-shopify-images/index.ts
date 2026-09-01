import "../_shared/strict-ai-generation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MigrateRequest {
  productId?: string; // Migrate single product
  batchSize?: number; // Number of images to migrate per run
  dryRun?: boolean;   // Just count, don't migrate
}

// Download image from URL and return as Uint8Array
async function downloadImage(url: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewAI/1.0)'
      }
    });
    
    if (!response.ok) {
      console.error(`[MIGRATE] Failed to download ${url}: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    return { data: new Uint8Array(arrayBuffer), contentType };
  } catch (error) {
    console.error(`[MIGRATE] Error downloading ${url}:`, error);
    return null;
  }
}

// Get file extension from content type
function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[contentType] || 'jpg';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { productId, batchSize = 50, dryRun = false }: MigrateRequest = body;

    console.log(`[MIGRATE] Starting image migration for user ${user.id}`);
    console.log(`[MIGRATE] Options: productId=${productId}, batchSize=${batchSize}, dryRun=${dryRun}`);

    // Find images that are still on Shopify CDN (not yet migrated to Supabase)
    let query = supabaseAdmin
      .from('product_images')
      .select(`
        id,
        product_id,
        src,
        alt_text,
        position,
        shopify_image_id,
        shopify_products!inner(seller_id, title)
      `)
      .eq('shopify_products.seller_id', user.id)
      .or('src.ilike.%cdn.shopify.com%,src.ilike.%shopifycdn.com%')
      .limit(batchSize);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data: imagesToMigrate, error: fetchError } = await query;

    if (fetchError) {
      console.error('[MIGRATE] Error fetching images:', fetchError);
      throw new Error(`Failed to fetch images: ${fetchError.message}`);
    }

    if (!imagesToMigrate || imagesToMigrate.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No images to migrate',
          migrated: 0,
          remaining: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MIGRATE] Found ${imagesToMigrate.length} images to migrate`);

    if (dryRun) {
      // Count total remaining
      const { count: totalRemaining } = await supabaseAdmin
        .from('product_images')
        .select('id', { count: 'exact', head: true })
        .eq('shopify_products.seller_id', user.id)
        .or('src.ilike.%cdn.shopify.com%,src.ilike.%shopifycdn.com%');

      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          toMigrate: imagesToMigrate.length,
          totalRemaining: totalRemaining || imagesToMigrate.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Migrate each image
    let migrated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const image of imagesToMigrate) {
      try {
        console.log(`[MIGRATE] Processing image ${image.id}: ${image.src.substring(0, 80)}...`);

        // Download the image
        const downloaded = await downloadImage(image.src);
        if (!downloaded) {
          errors.push(`Failed to download image ${image.id}`);
          failed++;
          continue;
        }

        // Generate filename
        const ext = getExtension(downloaded.contentType);
        const timestamp = Date.now();
        const fileName = `${user.id}/${image.product_id}/${image.shopify_image_id || image.id}_${timestamp}.${ext}`;

        console.log(`[MIGRATE] Uploading to Storage: ${fileName} (${downloaded.data.length} bytes)`);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('generated-images')
          .upload(fileName, downloaded.data, {
            contentType: downloaded.contentType,
            upsert: true
          });

        if (uploadError) {
          console.error(`[MIGRATE] Upload error for ${image.id}:`, uploadError);
          errors.push(`Upload failed for ${image.id}: ${uploadError.message}`);
          failed++;
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        console.log(`[MIGRATE] Uploaded successfully: ${publicUrl}`);

        // Update the image record with the new Supabase URL
        const { error: updateError } = await supabaseAdmin
          .from('product_images')
          .update({ 
            src: publicUrl,
            // Store original Shopify URL for reference (if we have a column for it)
            // original_shopify_url: image.src 
          })
          .eq('id', image.id);

        if (updateError) {
          console.error(`[MIGRATE] Update error for ${image.id}:`, updateError);
          errors.push(`Update failed for ${image.id}: ${updateError.message}`);
          failed++;
          continue;
        }

        migrated++;
        console.log(`[MIGRATE] ✅ Migrated image ${image.id} successfully`);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`[MIGRATE] Error processing image ${image.id}:`, error);
        errors.push(`Error for ${image.id}: ${error.message}`);
        failed++;
      }
    }

    // Count remaining images to migrate
    const { count: remaining } = await supabaseAdmin
      .from('product_images')
      .select('id', { count: 'exact', head: true })
      .or('src.ilike.%cdn.shopify.com%,src.ilike.%shopifycdn.com%');

    console.log(`[MIGRATE] Migration complete: ${migrated} migrated, ${failed} failed, ${remaining || 0} remaining`);

    return new Response(
      JSON.stringify({
        success: true,
        migrated,
        failed,
        remaining: remaining || 0,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit error list
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[MIGRATE] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
