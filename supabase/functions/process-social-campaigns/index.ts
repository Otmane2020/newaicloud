import "../_shared/strict-ai-generation.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    // Health check
    if (body?.healthCheck) {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentHour = now.getUTCHours();

    console.log(`[process-social-campaigns] Starting at ${now.toISOString()}, hour: ${currentHour}`);

    // Get active campaigns that are due to run
    const { data: campaigns, error: campaignsError } = await supabase
      .from('social_campaigns')
      .select('*')
      .eq('status', 'active')
      .eq('execution_hour', currentHour)
      .lte('next_run_at', now.toISOString());

    if (campaignsError) {
      throw campaignsError;
    }

    console.log(`[process-social-campaigns] Found ${campaigns?.length || 0} campaigns to process`);

    const results: any[] = [];

    for (const campaign of campaigns || []) {
      try {
        console.log(`[process-social-campaigns] Processing campaign: ${campaign.name}`);
        
        // Get products/content for this campaign
        let contentItems: any[] = [];
        
        if (campaign.content_type === 'products') {
          const query = supabase
            .from('shopify_products')
            .select(`
              id, title, body_html, handle, vendor, tags, status,
              product_images(id, src, alt_text, position),
              product_variants(id, title, price, compare_at_price, sku, option1, option2, option3)
            `)
            .eq('seller_id', campaign.user_id);
          
          if (campaign.product_ids?.length > 0) {
            query.in('id', campaign.product_ids);
          }
          
          const { data: products } = await query.limit(100);
          contentItems = products || [];
        } else if (campaign.content_type === 'collections') {
          const query = supabase
            .from('shopify_collections')
            .select('*')
            .eq('user_id', campaign.user_id);
          
          if (campaign.collection_ids?.length > 0) {
            query.in('id', campaign.collection_ids);
          }
          
          const { data: collections } = await query.limit(50);
          contentItems = collections || [];
        } else if (campaign.content_type === 'articles') {
          const { data: articles } = await supabase
            .from('blog_articles')
            .select('*')
            .eq('user_id', campaign.user_id)
            .eq('status', 'published')
            .limit(50);
          
          contentItems = articles || [];
        }

        if (contentItems.length === 0) {
          console.log(`[process-social-campaigns] No content found for campaign ${campaign.name}`);
          continue;
        }

        // Determine how many posts to create
        const postsToCreate = Math.min(campaign.posts_per_run || 1, contentItems.length);
        
        // Use round-robin selection starting from last_product_index
        let startIndex = (campaign.last_product_index || 0) % contentItems.length;
        
        for (let i = 0; i < postsToCreate; i++) {
          const contentIndex = (startIndex + i) % contentItems.length;
          const content = contentItems[contentIndex];
          
          // Get all images for products
          const images = content.product_images?.map((img: any) => img.src) || [];
          const mainImage = images[0] || content.image_src || content.featured_image;
          
          // Get variants info
          const variants = content.product_variants || [];
          const priceRange = variants.length > 0 
            ? {
                min: Math.min(...variants.map((v: any) => parseFloat(v.price) || 0)),
                max: Math.max(...variants.map((v: any) => parseFloat(v.price) || 0)),
              }
            : null;
          
          // Create post record
          const { data: post, error: postError } = await supabase
            .from('social_posts')
            .insert({
              user_id: campaign.user_id,
              store_id: campaign.store_id,
              campaign_id: campaign.id,
              content_type: campaign.content_type,
              content_id: content.id,
              template_style: campaign.template_style,
              channels: campaign.channels,
              status: 'pending',
              scheduled_at: now.toISOString(),
              metadata: {
                title: content.title,
                description: content.body_html || content.content || content.description,
                images: images,
                mainImage: mainImage,
                variants: variants,
                priceRange: priceRange,
                postFormat: campaign.post_format,
                musicTrack: campaign.music_track,
                voiceEnabled: campaign.voice_enabled,
                includeLogo: campaign.include_logo,
                includeLink: campaign.include_link,
              }
            })
            .select()
            .single();
          
          if (postError) {
            console.error(`[process-social-campaigns] Error creating post:`, postError);
            continue;
          }

          console.log(`[process-social-campaigns] Created post ${post.id} for ${content.title}`);
          
          // If auto-publish is enabled, publish immediately
          if (campaign.auto_publish !== false) {
            try {
              const publishResponse = await fetch(`${supabaseUrl}/functions/v1/publish-social-post`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  postId: post.id,
                  userId: campaign.user_id,
                }),
              });
              
              const publishResult = await publishResponse.json();
              console.log(`[process-social-campaigns] Publish result:`, publishResult);
            } catch (publishError) {
              console.error(`[process-social-campaigns] Publish error:`, publishError);
            }
          }
          
          results.push({
            campaignId: campaign.id,
            postId: post.id,
            contentTitle: content.title,
          });
        }

        // Update campaign: next run time and last product index
        const newLastIndex = (startIndex + postsToCreate) % contentItems.length;
        let nextRun = new Date(now);
        nextRun.setHours(campaign.execution_hour, 0, 0, 0);
        
        if (campaign.frequency === 'daily') {
          nextRun.setDate(nextRun.getDate() + 1);
        } else if (campaign.frequency === 'weekly') {
          nextRun.setDate(nextRun.getDate() + 7);
        } else if (campaign.frequency === 'monthly') {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }

        await supabase
          .from('social_campaigns')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun.toISOString(),
            last_product_index: newLastIndex,
            posts_generated: (campaign.posts_generated || 0) + postsToCreate,
          })
          .eq('id', campaign.id);

        console.log(`[process-social-campaigns] Campaign ${campaign.name} updated, next run: ${nextRun.toISOString()}`);
        
      } catch (campaignError: any) {
        console.error(`[process-social-campaigns] Error processing campaign ${campaign.id}:`, campaignError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: campaigns?.length || 0,
      posts: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[process-social-campaigns] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
