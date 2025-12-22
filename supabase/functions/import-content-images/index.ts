import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  storeId: string;
  types?: ('collections' | 'pages' | 'articles' | 'homepage')[];
}

// 🔒 CRITICAL: Check if an AI-generated image exists for this content
// If an AI image exists, we MUST NOT overwrite it with a Shopify import
async function isAiImageExists(
  supabaseClient: any,
  contentType: string,
  contentId: string,
  src: string
): Promise<boolean> {
  // Check if there's an existing AI-generated image for this content position
  const { data: existingImage } = await supabaseClient
    .from("content_images")
    .select("id, is_ai_generated, src")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .eq("src", src)
    .maybeSingle();

  if (existingImage?.is_ai_generated === true) {
    console.log(`🔒 [PROTECT] AI image exists for ${contentType}/${contentId}, skipping Shopify import`);
    return true;
  }

  return false;
}

// 🔒 CRITICAL: Safe upsert that protects AI-generated images
async function safeUpsertContentImage(
  supabaseClient: any,
  imageData: {
    user_id: string;
    store_id: string;
    content_type: string;
    content_id: string;
    src: string;
    alt_text: string | null;
    position: number;
  }
): Promise<{ success: boolean; skipped: boolean }> {
  // First, check if an AI image exists at this position for this content
  const { data: existingImages } = await supabaseClient
    .from("content_images")
    .select("id, is_ai_generated, src, position")
    .eq("content_type", imageData.content_type)
    .eq("content_id", imageData.content_id)
    .eq("position", imageData.position);

  // If any AI-generated image exists at this position, skip
  const aiImageExists = existingImages?.some((img: any) => img.is_ai_generated === true);
  if (aiImageExists) {
    console.log(`🔒 [PROTECT] AI image at position ${imageData.position} for ${imageData.content_type}, skipping`);
    return { success: true, skipped: true };
  }

  // Also check by exact src match (in case src is the conflict key)
  const isAiByUrl = await isAiImageExists(
    supabaseClient,
    imageData.content_type,
    imageData.content_id,
    imageData.src
  );
  if (isAiByUrl) {
    return { success: true, skipped: true };
  }

  // Safe to upsert - mark as NOT AI-generated (from Shopify)
  const { error } = await supabaseClient
    .from("content_images")
    .upsert({
      ...imageData,
      is_ai_generated: false, // 🔥 Explicitly mark as Shopify import
    }, {
      onConflict: 'content_type,content_id,src',
      ignoreDuplicates: false
    });

  if (error) {
    console.error(`[CONTENT-IMAGES] Upsert error:`, error);
    return { success: false, skipped: false };
  }

  return { success: true, skipped: false };
}

function extractImagesFromHtml(html: string): Array<{ src: string; alt: string | null }> {
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi;
  const images: Array<{ src: string; alt: string | null }> = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    images.push({
      src: match[1],
      alt: match[2] || null
    });
  }

  return images;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Parse request body first to check for serviceMode
    const body = await req.json();
    const { serviceMode, userId: serviceModeUserId, storeId, types = ['collections', 'pages', 'articles', 'homepage'] } = body;

    const authHeader = req.headers.get("Authorization");
    
    // Service mode: use provided userId without JWT validation
    let user: any;
    let supabaseClient: any;
    
    if (serviceMode === true && serviceModeUserId) {
      console.log('[IMPORT-CONTENT-IMAGES] 🔧 SERVICE MODE: Using provided userId:', serviceModeUserId);
      supabaseClient = createClient(supabaseUrl, supabaseKey);
      user = { id: serviceModeUserId };
    } else {
      // Normal mode: require JWT authentication
      if (!authHeader) {
        throw new Error("Missing authorization header");
      }

      supabaseClient = createClient(supabaseUrl, supabaseKey);

      const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (userError || !authUser) {
        throw new Error("Unauthorized");
      }
      
      user = authUser;
    }

    console.log(`[IMPORT-CONTENT-IMAGES] Starting import for user ${user.id}, store ${storeId}`);
    console.log(`[IMPORT-CONTENT-IMAGES] Types: ${types.join(', ')}`);

    // Get store connection
    const { data: store, error: storeError } = await supabaseClient
      .from("shopify_connections")
      .select("store_url, access_token")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single();

    console.log(`[IMPORT-CONTENT-IMAGES] Store query result:`, { found: !!store, error: storeError?.message });

    if (storeError) {
      throw new Error(`Store fetch error: ${storeError.message}`);
    }

    if (!store) {
      throw new Error("Store not found for this user");
    }

    const apiVersion = "2024-07";
    const baseUrl = `https://${store.store_url}/admin/api/${apiVersion}`;
    const headers = {
      "X-Shopify-Access-Token": store.access_token,
      "Content-Type": "application/json",
    };

    let totalImported = 0;
    let skippedAiImages = 0; // 🔒 Track AI images we protected
    const breakdown = { collections: 0, pages: 0, articles: 0, homepage: 0 };
    const filtered = { total: 0, excluded: 0, reasons: [] as string[] };

    // Import Collections (both custom and smart)
    if (types.includes('collections')) {
      console.log(`[COLLECTIONS] Fetching collections...`);
      
      // Fetch custom collections
      const customCollectionsResponse = await fetch(
        `${baseUrl}/custom_collections.json?fields=id,title,handle,body_html,image`,
        { headers }
      );

      const collections = [];
      if (customCollectionsResponse.ok) {
        const collectionsData = await customCollectionsResponse.json();
        collections.push(...(collectionsData.custom_collections || []));
      }

      // Fetch smart collections
      const smartCollectionsResponse = await fetch(
        `${baseUrl}/smart_collections.json?fields=id,title,handle,body_html,image`,
        { headers }
      );

      if (smartCollectionsResponse.ok) {
        const collectionsData = await smartCollectionsResponse.json();
        collections.push(...(collectionsData.smart_collections || []));
      }

      console.log(`[COLLECTIONS] Found ${collections.length} collections total`);

      for (const collection of collections) {
          // Upsert collection
          const { data: dbCollection, error: collectionError } = await supabaseClient
            .from("shopify_collections")
            .upsert({
              user_id: user.id,
              store_id: storeId,
              shopify_collection_id: collection.id,
              title: collection.title,
              handle: collection.handle,
              body_html: collection.body_html,
              image_url: collection.image?.src,
              image_alt: collection.image?.alt,
            }, {
              onConflict: 'shopify_collection_id',
              ignoreDuplicates: false
            })
            .select()
            .single();

          if (collectionError) {
            console.error(`[COLLECTIONS] Error upserting collection ${collection.id}:`, collectionError);
            continue;
          }

          // Add collection main image - 🔒 WITH AI PROTECTION
          if (collection.image?.src) {
            const result = await safeUpsertContentImage(supabaseClient, {
              user_id: user.id,
              store_id: storeId,
              content_type: 'collection',
              content_id: dbCollection.id,
              src: collection.image.src,
              alt_text: collection.image.alt || null,
              position: 0
            });

            if (result.success && !result.skipped) {
              totalImported++;
            } else if (result.skipped) {
              skippedAiImages++;
            }
          }

          // Extract images from body_html - 🔒 WITH AI PROTECTION
          if (collection.body_html) {
            const htmlImages = extractImagesFromHtml(collection.body_html);
            for (let i = 0; i < htmlImages.length; i++) {
              const result = await safeUpsertContentImage(supabaseClient, {
                user_id: user.id,
                store_id: storeId,
                content_type: 'collection',
                content_id: dbCollection.id,
                src: htmlImages[i].src,
                alt_text: htmlImages[i].alt,
                position: i + 1
              });

              if (result.success && !result.skipped) {
                totalImported++;
                breakdown.collections++;
              } else if (result.skipped) {
                skippedAiImages++;
              }
            }
          }
        }
      }

    // Import Pages
    if (types.includes('pages')) {
      console.log(`[PAGES] Fetching pages...`);
      
      const pagesResponse = await fetch(
        `${baseUrl}/pages.json?fields=id,title,handle,body_html`,
        { headers }
      );

      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        const pages = pagesData.pages || [];

        console.log(`[PAGES] Found ${pages.length} pages`);

        for (const page of pages) {
          // Get or find the page in DB
          const { data: dbPage } = await supabaseClient
            .from("shopify_pages")
            .select("id")
            .eq("shopify_page_id", page.id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (!dbPage) {
            console.warn(`[PAGES] Page ${page.id} not found in DB, skipping`);
            continue;
          }

          // Extract images from body_html - 🔒 WITH AI PROTECTION
          if (page.body_html) {
            const htmlImages = extractImagesFromHtml(page.body_html);
            for (let i = 0; i < htmlImages.length; i++) {
              const result = await safeUpsertContentImage(supabaseClient, {
                user_id: user.id,
                store_id: storeId,
                content_type: 'page',
                content_id: dbPage.id,
                src: htmlImages[i].src,
                alt_text: htmlImages[i].alt,
                position: i
              });

              if (result.success && !result.skipped) {
                totalImported++;
                breakdown.pages++;
              } else if (result.skipped) {
                skippedAiImages++;
              }
            }
          }
        }
      }
    }

    // Import Articles
    if (types.includes('articles')) {
      console.log(`[ARTICLES] Fetching articles...`);
      
      // Get all blogs first
      const blogsResponse = await fetch(
        `${baseUrl}/blogs.json?fields=id`,
        { headers }
      );

      if (blogsResponse.ok) {
        const blogsData = await blogsResponse.json();
        const blogs = blogsData.blogs || [];

        for (const blog of blogs) {
          const articlesResponse = await fetch(
            `${baseUrl}/blogs/${blog.id}/articles.json?fields=id,title,body_html`,
            { headers }
          );

          if (articlesResponse.ok) {
            const articlesData = await articlesResponse.json();
            const articles = articlesData.articles || [];

            console.log(`[ARTICLES] Found ${articles.length} articles in blog ${blog.id}`);

            for (const article of articles) {
              // Get or find the article in DB
              const { data: dbArticle } = await supabaseClient
                .from("blog_articles")
                .select("id")
                .eq("shopify_article_id", article.id)
                .eq("user_id", user.id)
                .maybeSingle();

              if (!dbArticle) {
                console.warn(`[ARTICLES] Article ${article.id} not found in DB, skipping`);
                continue;
              }

              // Extract images from body_html - 🔒 WITH AI PROTECTION
              if (article.body_html) {
                const htmlImages = extractImagesFromHtml(article.body_html);
                for (let i = 0; i < htmlImages.length; i++) {
                  const result = await safeUpsertContentImage(supabaseClient, {
                    user_id: user.id,
                    store_id: storeId,
                    content_type: 'article',
                    content_id: dbArticle.id,
                    src: htmlImages[i].src,
                    alt_text: htmlImages[i].alt,
                    position: i
                  });

                  if (result.success && !result.skipped) {
                    totalImported++;
                    breakdown.articles++;
                  } else if (result.skipped) {
                    skippedAiImages++;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Import Homepage Images
    if (types.includes('homepage')) {
      console.log(`[HOMEPAGE] Fetching homepage images from ${store.store_url}...`);
      
      try {
        // Fetch the homepage HTML directly
        const homepageResponse = await fetch(`https://${store.store_url}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewAI/1.0)',
            'Accept': 'text/html',
          },
        });

        if (homepageResponse.ok) {
          const homepageHtml = await homepageResponse.text();
          const homepageImages = extractImagesFromHtml(homepageHtml);
          
          console.log(`[HOMEPAGE] Found ${homepageImages.length} total images from HTML`);
          
          // Track filtering stats
          const filterReasons = { favicon: 0, dataUrl: 0, tooShort: 0 };
          
          // More lenient filtering - only skip obvious non-content images
          const validImages = homepageImages.filter(img => {
            const src = img.src.toLowerCase();
            
            if (src.startsWith('data:')) {
              filterReasons.dataUrl++;
              filtered.excluded++;
              return false;
            }
            
            if (src.includes('favicon')) {
              filterReasons.favicon++;
              filtered.excluded++;
              return false;
            }
            
            if (src.length <= 15) {
              filterReasons.tooShort++;
              filtered.excluded++;
              return false;
            }
            
            return true;
          });
          
          filtered.total = homepageImages.length;
          if (filterReasons.favicon > 0) filtered.reasons.push(`favicon (${filterReasons.favicon})`);
          if (filterReasons.dataUrl > 0) filtered.reasons.push(`data URLs (${filterReasons.dataUrl})`);
          if (filterReasons.tooShort > 0) filtered.reasons.push(`URLs trop courtes (${filterReasons.tooShort})`);
          
          console.log(`[HOMEPAGE] ${validImages.length} valid images after filtering`);

          for (let i = 0; i < validImages.length; i++) {
            let src = validImages[i].src;
            
            // Convert relative URLs to absolute
            if (src.startsWith('//')) {
              src = 'https:' + src;
            } else if (src.startsWith('/')) {
              src = `https://${store.store_url}${src}`;
            }
            
            console.log(`[HOMEPAGE] Processing image ${i + 1}/${validImages.length}: ${src.substring(0, 80)}...`);
            
            // 🔒 Use safe upsert WITH AI PROTECTION
            const result = await safeUpsertContentImage(supabaseClient, {
              user_id: user.id,
              store_id: storeId,
              content_type: 'homepage',
              content_id: user.id, // Use user_id as content_id for homepage
              src: src,
              alt_text: validImages[i].alt || null,
              position: i
            });

            if (result.success && !result.skipped) {
              console.log(`[HOMEPAGE] ✅ Successfully upserted image ${i + 1}`);
              totalImported++;
              breakdown.homepage++;
            } else if (result.skipped) {
              console.log(`[HOMEPAGE] 🔒 Skipped AI image ${i + 1}`);
              skippedAiImages++;
            }
          }
          
          console.log(`[HOMEPAGE] ✅ Completed homepage import: ${breakdown.homepage} images saved`);
        } else {
          console.error(`[HOMEPAGE] Failed to fetch homepage: ${homepageResponse.status} ${homepageResponse.statusText}`);
        }
      } catch (error) {
        console.error(`[HOMEPAGE] Error processing homepage:`, error);
      }
    }

    console.log(`[IMPORT-CONTENT-IMAGES] ✅ Import complete: ${totalImported} images imported, ${skippedAiImages} AI images protected`);
    console.log(`[IMPORT-CONTENT-IMAGES] Breakdown:`, breakdown);
    
    // 🔥 NEW: Update sync_history for live progress (final update for images)
    const syncHistoryId = body.syncHistoryId;
    if (syncHistoryId) {
      await supabaseClient
        .from('sync_history')
        .update({
          items_synced: totalImported,
          sync_type: 'images'
        })
        .eq('id', syncHistoryId);
      console.log(`📊 [LIVE PROGRESS] Images: ${totalImported} total`);
    }

    // Count total images including product images
    const { count: contentImagesCount } = await supabaseClient
      .from('content_images')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    // Get user's product IDs first, then count their images
    const { data: userProducts } = await supabaseClient
      .from('shopify_products')
      .select('id')
      .eq('seller_id', user.id);
    
    const productIds = userProducts?.map((p: any) => p.id) || [];
    
    let productImagesCount = 0;
    if (productIds.length > 0) {
      const { count } = await supabaseClient
        .from('product_images')
        .select('*', { count: 'exact', head: true })
        .in('product_id', productIds);
      productImagesCount = count || 0;
    }
    
    const totalImages = (contentImagesCount || 0) + productImagesCount;
    
    console.log(`[IMPORT-CONTENT-IMAGES] Total images: ${totalImages} (content: ${contentImagesCount}, products: ${productImagesCount})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${totalImported} images (${skippedAiImages} AI images protected)`,
        totalImported,
        skippedAiImages, // 🔒 NEW: Track protected AI images
        totalImages,
        contentImagesCount: contentImagesCount || 0,
        productImagesCount: productImagesCount || 0,
        breakdown,
        filtered: filtered.excluded > 0 ? filtered : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("[IMPORT-CONTENT-IMAGES] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});