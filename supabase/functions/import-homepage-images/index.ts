import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get active store
    const { data: store, error: storeError } = await supabase
      .from('shopify_connections')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      throw new Error('No active Shopify store found');
    }

    // Fetch theme assets to find images in homepage sections
    const themeResponse = await fetch(
      `https://${store.shop_domain}/admin/api/2025-01/themes.json`,
      {
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!themeResponse.ok) {
      throw new Error('Failed to fetch themes');
    }

    const themesData = await themeResponse.json();
    const mainTheme = themesData.themes.find((t: any) => t.role === 'main');

    if (!mainTheme) {
      throw new Error('No main theme found');
    }

    // Fetch theme files to get homepage sections
    const assetsResponse = await fetch(
      `https://${store.shop_domain}/admin/api/2025-01/themes/${mainTheme.id}/assets.json`,
      {
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!assetsResponse.ok) {
      throw new Error('Failed to fetch theme assets');
    }

    const assetsData = await assetsResponse.json();
    
    // Find images from templates/index.json (homepage sections)
    const indexTemplate = assetsData.assets.find((a: any) => a.key === 'templates/index.json');
    
    let homepageImages: { src: string; alt_text: string | null }[] = [];

    if (indexTemplate) {
      const templateResponse = await fetch(
        `https://${store.shop_domain}/admin/api/2025-01/themes/${mainTheme.id}/assets.json?asset[key]=${encodeURIComponent(indexTemplate.key)}`,
        {
          headers: {
            'X-Shopify-Access-Token': store.access_token,
            'Content-Type': 'application/json',
          },
        }
      );

      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        const content = JSON.parse(templateData.asset.value);
        
        // Extract images from sections
        if (content.sections) {
          Object.values(content.sections).forEach((section: any) => {
            if (section.settings) {
              Object.entries(section.settings).forEach(([key, value]) => {
                if ((key.includes('image') || key.includes('img')) && typeof value === 'string' && value.startsWith('http')) {
                  homepageImages.push({
                    src: value,
                    alt_text: section.settings[`${key}_alt`] || null
                  });
                }
              });
            }
            // Check blocks inside sections
            if (section.blocks) {
              Object.values(section.blocks).forEach((block: any) => {
                if (block.settings) {
                  Object.entries(block.settings).forEach(([key, value]) => {
                    if ((key.includes('image') || key.includes('img')) && typeof value === 'string' && value.startsWith('http')) {
                      homepageImages.push({
                        src: value,
                        alt_text: block.settings[`${key}_alt`] || null
                      });
                    }
                  });
                }
              });
            }
          });
        }
      }
    }

    // Remove duplicates
    const uniqueImages = Array.from(
      new Map(homepageImages.map(img => [img.src, img])).values()
    );

    // Store images in homepage_images table
    let importedCount = 0;
    for (const img of uniqueImages) {
      const { error: insertError } = await supabase
        .from('homepage_images')
        .upsert({
          user_id: user.id,
          store_id: (await supabase.from('shopify_connections').select('id').eq('user_id', user.id).single()).data?.id,
          src: img.src,
          alt_text: img.alt_text,
          position: importedCount,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,src',
          ignoreDuplicates: false
        });

      if (!insertError) {
        importedCount++;
      }
    }

    console.log(`Imported ${importedCount} homepage images`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: importedCount,
        total: uniqueImages.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error importing homepage images:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
