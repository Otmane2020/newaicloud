import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 [process-aeo-calendar] Starting CRON job...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    console.log(`📅 Current hour: ${currentHour}, day: ${currentDay}`);

    // Fetch active calendars that should run at this hour
    const { data: calendars, error: calError } = await supabase
      .from('aeo_publication_calendar')
      .select('*')
      .eq('is_active', true)
      .eq('publication_hour', currentHour);

    if (calError) {
      console.error('❌ Error fetching calendars:', calError);
      throw calError;
    }

    console.log(`📋 Found ${calendars?.length || 0} active calendars for hour ${currentHour}`);

    const results = {
      processed: 0,
      qa_published: 0,
      pillars_generated: 0,
      errors: [] as string[],
    };

    for (const calendar of calendars || []) {
      console.log(`\n🔄 Processing calendar for user: ${calendar.user_id}`);
      
      try {
        // 1. Publish Q&A articles
        const qaCount = calendar.qa_per_day || 1;
        
        // Get unpublished answers
        const { data: answers, error: answersError } = await supabase
          .from('ai_answers')
          .select('*')
          .eq('user_id', calendar.user_id)
          .is('synced_at', null)
          .order('created_at', { ascending: true })
          .limit(qaCount);

        if (answersError) {
          console.error('❌ Error fetching answers:', answersError);
          results.errors.push(`User ${calendar.user_id}: ${answersError.message}`);
          continue;
        }

        console.log(`📝 Found ${answers?.length || 0} Q&A to publish`);

        // Publish each Q&A
        for (const answer of answers || []) {
          try {
            // Call generate-aeo-article function
            const { data: articleResult, error: genError } = await supabase.functions.invoke('generate-aeo-article', {
              body: {
                user_id: calendar.user_id,
                store_id: calendar.store_id,
                answer_id: answer.id,
                direct_answer: answer.direct_answer,
                question: answer.question,
                keywords: answer.keywords,
                supporting_content: answer.supporting_content,
                platform: answer.platform,
                add_pillar_link: calendar.link_qa_to_pillar,
              }
            });

            if (genError) {
              console.error('❌ Error generating article:', genError);
              results.errors.push(`Q&A ${answer.id}: ${genError.message}`);
            } else {
              console.log(`✅ Q&A article created: ${articleResult?.article?.id}`);
              results.qa_published++;
            }
          } catch (err: unknown) {
            console.error('❌ Error processing Q&A:', err);
            results.errors.push(`Q&A ${answer.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }

        // 2. Check if we should generate a pillar article today
        const shouldGeneratePillar = checkPillarSchedule(calendar, currentDay);
        
        if (shouldGeneratePillar) {
          console.log('📚 Generating pillar article...');
          
          try {
            // Call generate-aeo-pillar-article function
            const { data: pillarResult, error: pillarError } = await supabase.functions.invoke('generate-aeo-pillar-article', {
              body: {
                user_id: calendar.user_id,
                store_id: calendar.store_id,
                link_to_qas: calendar.link_qa_to_pillar,
              }
            });

            if (pillarError) {
              console.error('❌ Error generating pillar:', pillarError);
              results.errors.push(`Pillar for ${calendar.user_id}: ${pillarError.message}`);
            } else {
              console.log(`✅ Pillar article created: ${pillarResult?.article?.id}`);
              results.pillars_generated++;
            }
          } catch (err: unknown) {
            console.error('❌ Error generating pillar:', err);
            results.errors.push(`Pillar for ${calendar.user_id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }

        // 3. Update calendar stats
        const updates: Record<string, any> = {
          last_qa_published_at: new Date().toISOString(),
          total_qa_published: (calendar.total_qa_published || 0) + (answers?.length || 0),
        };

        if (shouldGeneratePillar) {
          updates.last_pillar_published_at = new Date().toISOString();
          updates.total_pillars_published = (calendar.total_pillars_published || 0) + 1;
        }

        await supabase
          .from('aeo_publication_calendar')
          .update(updates)
          .eq('id', calendar.id);

        results.processed++;
        
      } catch (err: unknown) {
        console.error('❌ Error processing calendar:', err);
        results.errors.push(`Calendar ${calendar.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log('\n📊 Final results:', results);

    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('❌ [process-aeo-calendar] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function checkPillarSchedule(calendar: any, currentDay: number): boolean {
  if (calendar.pillar_day_of_week !== currentDay) {
    return false;
  }

  const frequency = calendar.pillar_frequency;
  const today = new Date();
  const dayOfMonth = today.getDate();
  const weekOfMonth = Math.floor((dayOfMonth - 1) / 7);

  switch (frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return true;
    case 'bi-weekly':
      return weekOfMonth % 2 === 0;
    case 'monthly':
      return dayOfMonth <= 7;
    default:
      return true;
  }
}
