import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pageId } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Récupérer la page
    const { data: page, error: pageError } = await supabaseClient
      .from('shopify_pages')
      .select('*')
      .eq('id', pageId)
      .eq('user_id', user.id)
      .single();

    if (pageError) throw pageError;

    console.log(`Generating SEO for page: ${page.title}`);

    // Extraire du texte du HTML (simplifié)
    const textContent = page.body_html?.replace(/<[^>]*>/g, ' ').substring(0, 1000) || '';

    // Générer le SEO avec Lovable AI
    const prompt = `Génère un titre SEO optimisé (max 60 caractères) et une meta description (max 160 caractères) pour cette page Shopify:

Titre: ${page.title}
Contenu: ${textContent}

Réponds uniquement en JSON:
{
  "seo_title": "...",
  "seo_description": "..."
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert SEO. Réponds uniquement en JSON valide sans markdown.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Nettoyer les balises markdown si présentes
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const seoData = JSON.parse(cleanContent);

    console.log('Generated SEO:', seoData);

    // Mettre à jour la page
    const { error: updateError } = await supabaseClient
      .from('shopify_pages')
      .update({
        seo_title: seoData.seo_title,
        seo_description: seoData.seo_description,
        optimized: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        seo_title: seoData.seo_title,
        seo_description: seoData.seo_description
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
