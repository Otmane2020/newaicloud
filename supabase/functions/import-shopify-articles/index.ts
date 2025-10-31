import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const { shopName, authToken, storeId } = requestBody;

    if (!shopName || !authToken) {
      return new Response(
        JSON.stringify({ error: 'Missing shopName or authToken' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cleanShopName = shopName.replace('.myshopify.com', '');
    
    // Use service role client for database operations
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('📰 Starting Shopify blog articles import...');

    // Step 1: Fetch blogs
    const blogsResponse = await fetch(
      `https://${cleanShopName}.myshopify.com/admin/api/2025-01/blogs.json`,
      {
        headers: {
          "X-Shopify-Access-Token": authToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!blogsResponse.ok) {
      const errorText = await blogsResponse.text();
      console.error(`❌ Shopify blogs API error: ${blogsResponse.status}`, errorText);
      return new Response(
        JSON.stringify({ error: `Shopify API error: ${blogsResponse.status}` }),
        {
          status: blogsResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { blogs }: { blogs: ShopifyBlog[] } = await blogsResponse.json();
    
    if (!blogs || blogs.length === 0) {
      console.log('⚠️ No blogs found in Shopify');
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: 0, 
          message: 'No blogs found' 
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
            "X-Shopify-Access-Token": authToken,
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
      console.log('⚠️ No articles found in any blog');
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: 0, 
          message: 'No articles found' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📝 Total articles to import: ${allArticles.length}`);

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

      return {
        user_id: user.id,
        title: article.title,
        content: article.body_html || '',
        meta_description: metaDescription,
        keywords: keywords,
        status: article.published_at ? 'published' : 'draft',
        published_at: article.published_at,
        shopify_article_id: article.id.toString(), // Fixed: changed from shopify_blog_id to shopify_article_id
        source: 'shopify_import',
        created_at: new Date().toISOString(),
        updated_at: article.updated_at,
      };
    });

    // Log first article for debugging
    console.log('First article to insert:', JSON.stringify(articlesToInsert[0], null, 2));

    // Step 4: Insert articles into database
    const { data: insertedArticles, error: insertError } = await supabaseServiceClient
      .from('blog_articles')
      .upsert(articlesToInsert, {
        onConflict: 'shopify_article_id', // Fixed: changed from shopify_blog_id to shopify_article_id
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting articles:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to save articles: ${insertError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Successfully imported ${insertedArticles?.length || 0} articles`);

    // NOTE: Imported articles from Shopify don't count towards usage limits
    // Only AI-generated articles count towards the limit

    return new Response(
      JSON.stringify({
        success: true,
        count: insertedArticles?.length || 0,
        message: `Successfully imported ${insertedArticles?.length || 0} blog articles`,
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