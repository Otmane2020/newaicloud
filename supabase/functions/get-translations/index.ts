import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lang = url.searchParams.get('lng') || url.searchParams.get('lang') || 'en';

    console.log(`Loading translations for language: ${lang}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all translations for this language
    const { data: translations, error } = await supabase
      .from('translations')
      .select('key, value')
      .eq('language', lang);

    if (error) {
      console.error('Error fetching translations:', error);
      throw error;
    }

    // Reconstruct hierarchical JSON structure
    const result: Record<string, any> = {};

    translations?.forEach((item) => {
      const keys = item.key.split('.');
      let current = result;

      keys.forEach((key: string, index: number) => {
        if (index === keys.length - 1) {
          current[key] = item.value;
        } else {
          if (!current[key]) {
            current[key] = {};
          }
          current = current[key];
        }
      });
    });

    console.log(`Loaded ${translations?.length || 0} translations for ${lang}`);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      }
    );
  } catch (error) {
    console.error('Error in get-translations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
