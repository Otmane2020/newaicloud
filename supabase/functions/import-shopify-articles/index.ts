import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function extractImagesFromHtml(html: string): Array<{ src: string; alt: string | null }> {
  const images: Array<{ src: string; alt: string | null }> = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    images.push({
      src: match[1],
      alt: match[2] || null
    });
  }
  
  return images;
}

interface ShopifyArticle {
  id: number;
  title: string;
  body_html: string;
  blog_id: number;
  author: string;
  user_id: number;
  published_at: string | null;
  updated_at: string;
  summary_html: string | null;
  template_suffix: string | null;
  handle: string;
  tags: string;
  admin_graphql_api_id: string;
}

interface ShopifyBlog {
  id: number;
  title: string;
  handle: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestBody = await req.json();
    const { shopName, apiSecret, authToken, storeId } = requestBody;

    if (!shopName) {
      return new Response(
        JSON.stringify({ error: 'Missing shopName' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine access token - fetch from DB if using OAuth (storeId)
    let accessToken = apiSecret || authToken;
    
    if (storeId && !accessToken) {
      console.log('🔍 [ARTICLES] Fetching access token from database for storeId:', storeId);
      
      // Use service role client to fetch access token
      const supabaseServiceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const { data: connection, error: connectionError } = await supabaseServiceClient
        .from('shopify_connections')
        .select('access_token, store_url, user_id')
        .eq('id', storeId)
        .single();
      
      console.log('📊 [ARTICLES] Connection query result:', {
        found: !!connection,
        error: connectionError?.message,
        userId: connection?.user_id,
        expectedUserId: user.id,
        hasToken: !!connection?.access_token
      });
      
      if (connectionError) {
        console.error('❌ [ARTICLES] Database error:', connectionError);
        return new Response(
          JSON.stringify({ error: `Database error: ${connectionError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (!connection) {
        console.error('❌ [ARTICLES] No connection found');
        return new Response(
          JSON.stringify({ error: 'Store connection not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (connection.user_id !== user.id) {
        console.error('❌ [ARTICLES] Store does not belong to user');
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to store' }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      accessToken = connection.access_token;
      console.log('✅ [ARTICLES] Using OAuth token from database (length:', accessToken?.length, ')');
    }
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token available' }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cleanShopName = shopName.replace('.myshopify.com', '');
    console.log(`📰 [IMPORT-ARTICLES] Starting import for shop: ${cleanShopName}, storeId: ${storeId}`);
    
    // Use service role client for database operations
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('📰 Starting Shopify blog articles import...');
    console.log('Shop name:', cleanShopName);
    console.log('Store ID:', storeId);

    // Step 1: Fetch blogs
    const blogsResponse = await fetch(
      `https://${cleanShopName}.myshopify.com/admin/api/2025-01/blogs.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!blogsResponse.ok) {
      const errorText = await blogsResponse.text();
      console.error(`❌ Shopify blogs API error: ${blogsResponse.status}`, errorText);
      
      // If it's a 403 error about read_content scope, return success with a message
      // This allows the sync to continue with other content types
      if (blogsResponse.status === 403 && errorText.includes('read_content')) {
        console.log('⚠️ [IMPORT-ARTICLES] Skipping articles import - read_content scope not approved');
        return new Response(
          JSON.stringify({ 
            success: true,
            articlesImported: 0,
            imagesImported: 0,
            message: 'Articles import skipped - read_content permission not approved by merchant',
            scopeError: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Shopify API error: ${blogsResponse.status}` }),
        {
          status: blogsResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { blogs }: { blogs: ShopifyBlog[] } = await blogsResponse.json();
    
    console.log(`📰 [IMPORT-ARTICLES] Found ${blogs?.length || 0} blogs in Shopify`);
    
    if (!blogs || blogs.length === 0) {
      console.log('⚠️ [IMPORT-ARTICLES] No blogs found in Shopify store');
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: 0, 
          imported: 0,
          message: 'No blogs found in Shopify' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Found ${blogs.length} blog(s)`);

    // Step 2: Fetch articles from each blog
    let allArticles: ShopifyArticle[] = [];
    
    for (const blog of blogs) {
      console.log(`📖 Fetching articles from blog: ${blog.title}`);
      
      let nextUrl: string | null = `https://${cleanShopName}.myshopify.com/admin/api/2025-01/blogs/${blog.id}/articles.json?limit=250`;
      
      while (nextUrl) {
        const articlesResponse = await fetch(nextUrl, {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        });

        if (!articlesResponse.ok) {
          console.error(`❌ Error fetching articles from blog ${blog.id}`);
          break;
        }

        const { articles }: { articles: ShopifyArticle[] } = await articlesResponse.json();
        
        if (articles && articles.length > 0) {
          allArticles = [...allArticles, ...articles];
          console.log(`  ✅ Fetched ${articles.length} articles`);
        } else {
          console.log(`  ⚠️ No articles found in blog ${blog.title}`);
        }

        // Check for pagination
        const linkHeader = articlesResponse.headers.get('Link');
        nextUrl = parseLinkHeader(linkHeader);
      }
    }

    if (allArticles.length === 0) {
      console.log('⚠️ [IMPORT-ARTICLES] No articles found in any blog');
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: 0,
          imported: 0,
          totalImported: 0,
          message: 'No articles found in any blog' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ [IMPORT-ARTICLES] Total articles to import: ${allArticles.length}`);

    console.log(`📝 Preparing ${allArticles.length} articles for database insertion...`);

    // Step 3: Prepare articles for insertion
    const articlesToInsert = allArticles.map((article) => {
      const keywords = article.tags ? article.tags.split(',').map(tag => tag.trim()) : [];
      
      // Extract plain text from body_html for meta_description
      const plainText = article.body_html?.replace(/<[^>]*>/g, '') || '';
      const summaryText = article.summary_html?.replace(/<[^>]*>/g, '') || '';
      
      // Pre-fill SEO fields
      const seoTitle = article.title;
      const metaDescription = summaryText.substring(0, 160) || 
                             plainText.substring(0, 160) || 
                             `Lisez ${article.title}`;

      // Extract first image as featured image
      const images = extractImagesFromHtml(article.body_html || '');
      const featuredImage = images.length > 0 ? images[0].src : null;

      return {
        user_id: user.id,
        store_id: storeId,
        title: article.title,
        content: article.body_html || '',
        meta_description: metaDescription,
        keywords: keywords,
        status: article.published_at ? 'published' : 'draft',
        published_at: article.published_at,
        shopify_article_id: article.id.toString(),
        shopify_blog_id: article.blog_id.toString(),
        source: 'shopify_import',
        featured_image: featuredImage,
        created_at: new Date().toISOString(),
        updated_at: article.updated_at,
      };
    });

    console.log('📊 Article preparation complete');
    console.log('First article sample:', JSON.stringify({
      title: articlesToInsert[0]?.title,
      blog_id: articlesToInsert[0]?.shopify_blog_id,
      article_id: articlesToInsert[0]?.shopify_article_id,
      store_id: articlesToInsert[0]?.store_id
    }, null, 2));

    // Step 4: Insert articles into database and extract images
    console.log('💾 Inserting articles into database...');
    let importedCount = 0;
    let totalImagesImported = 0;

    for (const article of allArticles) {
      const articleData = articlesToInsert[importedCount];
      
      const { data: dbArticle, error: articleError } = await supabaseServiceClient
        .from('blog_articles')
        .upsert(articleData, {
          onConflict: 'shopify_article_id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (articleError) {
        console.error(`❌ Error upserting article ${article.id}:`, articleError);
        continue;
      }

      // Extract and import images from article body_html
      if (article.body_html && dbArticle) {
        const images = extractImagesFromHtml(article.body_html);
        console.log(`📸 Found ${images.length} images in article: ${article.title}`);
        
        for (let i = 0; i < images.length; i++) {
          const { error: imageError } = await supabaseServiceClient
            .from('content_images')
            .upsert({
              user_id: user.id,
              store_id: storeId,
              content_type: 'article',
              content_id: dbArticle.id,
              src: images[i].src,
              alt_text: images[i].alt,
              position: i
            }, {
              onConflict: 'user_id,content_type,content_id,src'
            });

          if (!imageError) {
            totalImagesImported++;
          }
        }

        // Extract netlinking data
        console.log('🔗 Extracting netlinking data...');
        try {
          await supabaseServiceClient.functions.invoke('extract-netlinking-from-articles', {
            body: { article_ids: [dbArticle.id] }
          });
          console.log('✅ Netlinking extracted');
        } catch (netlinkError) {
          console.error('⚠️ Error extracting netlinking:', netlinkError);
          // Don't fail the entire import if netlinking extraction fails
        }
      }

      importedCount++;
    }

    console.log(`✅ Successfully imported ${importedCount} articles and ${totalImagesImported} images`);
    console.log('📈 Import statistics:', {
      total_fetched: allArticles.length,
      successfully_inserted: importedCount,
      images_imported: totalImagesImported,
      store_id: storeId
    });

    // 🧹 Cleanup: Delete articles that no longer exist in Shopify
    console.log(`🧹 [IMPORT-ARTICLES] Checking for deleted articles...`);
    const shopifyArticleIds = allArticles.map(a => a.id.toString());
    
    const { data: existingArticles, error: fetchError } = await supabaseServiceClient
      .from('blog_articles')
      .select('id, shopify_article_id, title')
      .eq('user_id', user.id)
      .eq('store_id', storeId);
    
    if (fetchError) {
      console.error(`⚠️ [IMPORT-ARTICLES] Error fetching existing articles:`, fetchError);
    } else if (existingArticles) {
      const articlesToDelete = existingArticles.filter(
        existing => existing.shopify_article_id && !shopifyArticleIds.includes(existing.shopify_article_id)
      );
      
      if (articlesToDelete.length > 0) {
        console.log(`🗑️ [IMPORT-ARTICLES] Found ${articlesToDelete.length} articles to delete:`);
        articlesToDelete.forEach(a => {
          console.log(`   - ${a.title} (Shopify ID: ${a.shopify_article_id})`);
        });
        
        const idsToDelete = articlesToDelete.map(a => a.id);
        const { error: deleteError } = await supabaseServiceClient
          .from('blog_articles')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error(`❌ [IMPORT-ARTICLES] Error deleting articles:`, deleteError);
        } else {
          console.log(`✅ [IMPORT-ARTICLES] Successfully deleted ${articlesToDelete.length} articles`);
        }
      } else {
        console.log(`✅ [IMPORT-ARTICLES] No articles to delete`);
      }
    }

    // NOTE: Imported articles from Shopify don't count towards usage limits
    // Only AI-generated articles count towards the limit

    return new Response(
      JSON.stringify({
        success: true,
        count: importedCount,
        imported: importedCount,
        totalImported: importedCount,
        images: totalImagesImported,
        message: `Successfully imported ${importedCount} blog articles and ${totalImagesImported} images`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("❌ Error importing articles:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to parse Link header for pagination
function parseLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel=\"next\"/);
    if (match) {
      return match[1];
    }
  }
  return null;
}