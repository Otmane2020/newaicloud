import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserInsight {
  totalActions: number;
  lastLogin: string | null;
  monthlyActions: number;
  weeklyActions: number;
  favoriteFeature: string | null;
  churnScore: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get total actions from user_activity
    const { data: activityData, error: activityError } = await supabaseClient
      .from("user_activity")
      .select("action_type, created_at")
      .eq("user_id", userId);

    if (activityError) throw activityError;

    const totalActions = activityData?.length || 0;

    // Get last login
    const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
    const lastLogin = userData?.user?.last_sign_in_at || null;

    // Calculate monthly and weekly actions
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklyActions = activityData?.filter((a) => new Date(a.created_at) > oneWeekAgo).length || 0;
    const monthlyActions = activityData?.filter((a) => new Date(a.created_at) > oneMonthAgo).length || 0;

    // Get favorite feature from feature_usage
    const { data: featureData } = await supabaseClient
      .from("feature_usage")
      .select("feature_name, usage_count")
      .eq("user_id", userId)
      .order("usage_count", { ascending: false })
      .limit(1)
      .single();

    const favoriteFeature = featureData?.feature_name || null;

    // Calculate churn score (0-100, higher = more likely to churn)
    let churnScore = 0;

    // Factor 1: Days since last login (max 40 points)
    if (lastLogin) {
      const daysSinceLogin = (now.getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24);
      churnScore += Math.min(40, daysSinceLogin * 2);
    } else {
      churnScore += 40; // Never logged in
    }

    // Factor 2: Low weekly activity (max 30 points)
    if (weeklyActions === 0) {
      churnScore += 30;
    } else if (weeklyActions < 5) {
      churnScore += 20;
    } else if (weeklyActions < 10) {
      churnScore += 10;
    }

    // Factor 3: No favorite feature (max 30 points)
    if (!favoriteFeature || !featureData) {
      churnScore += 30;
    } else if (featureData.usage_count < 5) {
      churnScore += 15;
    }

    churnScore = Math.min(100, Math.round(churnScore));

    const insight: UserInsight = {
      totalActions,
      lastLogin,
      monthlyActions,
      weeklyActions,
      favoriteFeature,
      churnScore,
    };

    return new Response(JSON.stringify(insight), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Error in admin-user-insights:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
