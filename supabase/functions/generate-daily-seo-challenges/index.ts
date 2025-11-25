import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Challenge {
  type: 'daily' | 'weekly' | 'achievement';
  category: 'optimization' | 'ranking' | 'traffic' | 'quality';
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  target_value: number;
  reward_points: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

const CHALLENGE_TEMPLATES: Challenge[] = [
  {
    type: 'daily',
    category: 'optimization',
    title_fr: 'Optimiser 5 produits',
    title_en: 'Optimize 5 products',
    description_fr: 'Optimisez le SEO de 5 produits pour améliorer leur visibilité',
    description_en: 'Optimize SEO for 5 products to improve their visibility',
    target_value: 5,
    reward_points: 15,
    difficulty: 'easy'
  },
  {
    type: 'daily',
    category: 'optimization',
    title_fr: 'Compléter 10 descriptions',
    title_en: 'Complete 10 descriptions',
    description_fr: 'Générez des descriptions optimisées pour 10 produits',
    description_en: 'Generate optimized descriptions for 10 products',
    target_value: 10,
    reward_points: 20,
    difficulty: 'medium'
  },
  {
    type: 'daily',
    category: 'quality',
    title_fr: 'Améliorer 3 images',
    title_en: 'Improve 3 images',
    description_fr: 'Optimisez les images de 3 produits avec des alt texts',
    description_en: 'Optimize images for 3 products with alt texts',
    target_value: 3,
    reward_points: 10,
    difficulty: 'easy'
  },
  {
    type: 'daily',
    category: 'optimization',
    title_fr: 'Atteindre 15 optimisations',
    title_en: 'Reach 15 optimizations',
    description_fr: 'Effectuez 15 optimisations SEO aujourd\'hui',
    description_en: 'Perform 15 SEO optimizations today',
    target_value: 15,
    reward_points: 30,
    difficulty: 'hard'
  },
  {
    type: 'daily',
    category: 'quality',
    title_fr: 'Score SEO parfait',
    title_en: 'Perfect SEO score',
    description_fr: 'Obtenez un score SEO de 90+ pour 2 produits',
    description_en: 'Achieve a SEO score of 90+ for 2 products',
    target_value: 2,
    reward_points: 25,
    difficulty: 'medium'
  },
  {
    type: 'daily',
    category: 'ranking',
    title_fr: 'Améliorer le classement',
    title_en: 'Improve ranking',
    description_fr: 'Optimisez vos produits pour améliorer votre position Google',
    description_en: 'Optimize your products to improve your Google ranking',
    target_value: 5,
    reward_points: 20,
    difficulty: 'medium'
  }
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Safe HealthCheck handler
  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🎯 Starting daily SEO challenges generation...');

    // Get all active users with profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, language')
      .limit(1000);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`📊 Found ${profiles?.length || 0} users`);

    let challengesCreated = 0;
    let notificationsSent = 0;

    for (const profile of profiles || []) {
      try {
        // Expire old challenges
        await supabase
          .from('seo_challenges')
          .update({ status: 'expired' })
          .eq('user_id', profile.id)
          .eq('status', 'active')
          .lt('expires_at', new Date().toISOString());

        // Select random challenges (2-3 per user per day)
        const numChallenges = Math.floor(Math.random() * 2) + 2; // 2 or 3
        const shuffled = [...CHALLENGE_TEMPLATES].sort(() => 0.5 - Math.random());
        const selectedChallenges = shuffled.slice(0, numChallenges);

        const language = profile.language || 'fr';

        for (const template of selectedChallenges) {
          const expiresAt = new Date();
          expiresAt.setHours(23, 59, 59, 999); // End of day

          const title = language === 'en' ? template.title_en : template.title_fr;
          const description = language === 'en' ? template.description_en : template.description_fr;

          // Create challenge
          const { data: challenge, error: challengeError } = await supabase
            .from('seo_challenges')
            .insert({
              user_id: profile.id,
              challenge_type: template.type,
              category: template.category,
              title,
              description,
              target_value: template.target_value,
              reward_points: template.reward_points,
              difficulty: template.difficulty,
              expires_at: expiresAt.toISOString(),
              status: 'active'
            })
            .select()
            .single();

          if (challengeError) {
            console.error(`Error creating challenge for user ${profile.id}:`, challengeError);
            continue;
          }

          challengesCreated++;

          // Send notification
          try {
            const { error: notifError } = await supabase.functions.invoke('send-notification', {
              body: {
                user_id: profile.id,
                template_code: 'seo_challenge_new',
                metadata: {
                  title,
                  description,
                  target: template.target_value
                },
                language,
                force_browser: true
              }
            });

            if (!notifError) {
              notificationsSent++;
            }
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
          }
        }
      } catch (error) {
        console.error(`Error processing user ${profile.id}:`, error);
      }
    }

    console.log(`✅ Generated ${challengesCreated} challenges and sent ${notificationsSent} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true,
        challenges_created: challengesCreated,
        notifications_sent: notificationsSent,
        users_processed: profiles?.length || 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-daily-seo-challenges:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
