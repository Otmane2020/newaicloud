import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  storeId: string;
  types?: ('collections' | 'pages' | 'articles')[];
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { storeId, types = ['collections', 'pages', 'articles'] }: ImportRequest = await req.json();

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

          // Add collection main image
          if (collection.image?.src) {
            await supabaseClient
              .from("content_images")
              .upsert({
                user_id: user.id,
                store_id: storeId,
                content_type: 'collection',
                content_id: dbCollection.id,
                src: collection.image.src,
                alt_text: collection.image.alt,
                position: 0
              }, {
                onConflict: 'content_type,content_id,src',
                ignoreDuplicates: false
              });

            totalImported++;
          }

          // Extract images from body_html
          if (collection.body_html) {
            const htmlImages = extractImagesFromHtml(collection.body_html);
            for (let i = 0; i < htmlImages.length; i++) {
              await supabaseClient
                .from("content_images")
                .upsert({
                  user_id: user.id,
                  store_id: storeId,
                  content_type: 'collection',
                  content_id: dbCollection.id,
                  src: htmlImages[i].src,
                  alt_text: htmlImages[i].alt,
                  position: i + 1
                }, {
                  onConflict: 'content_type,content_id,src',
                  ignoreDuplicates: false
                });

              totalImported++;
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

          // Extract images from body_html
          if (page.body_html) {
            const htmlImages = extractImagesFromHtml(page.body_html);
            for (let i = 0; i < htmlImages.length; i++) {
              await supabaseClient
                .from("content_images")
                .upsert({
                  user_id: user.id,
                  store_id: storeId,
                  content_type: 'page',
                  content_id: dbPage.id,
                  src: htmlImages[i].src,
                  alt_text: htmlImages[i].alt,
                  position: i
                }, {
                  onConflict: 'content_type,content_id,src',
                  ignoreDuplicates: false
                });

              totalImported++;
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

              // Extract images from body_html
              if (article.body_html) {
                const htmlImages = extractImagesFromHtml(article.body_html);
                for (let i = 0; i < htmlImages.length; i++) {
                  await supabaseClient
                    .from("content_images")
                    .upsert({
                      user_id: user.id,
                      store_id: storeId,
                      content_type: 'article',
                      content_id: dbArticle.id,
                      src: htmlImages[i].src,
                      alt_text: htmlImages[i].alt,
                      position: i
                    }, {
                      onConflict: 'content_type,content_id,src',
                      ignoreDuplicates: false
                    });

                  totalImported++;
                }
              }
            }
          }
        }
      }
    }

    console.log(`[IMPORT-CONTENT-IMAGES] ✅ Import complete: ${totalImported} images`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${totalImported} images`,
        totalImported
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