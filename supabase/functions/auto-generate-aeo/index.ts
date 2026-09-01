import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const { websiteUrl, language = "fr" } = await req.json();

    console.log(`[auto-generate-aeo] Starting for user ${userId}, website: ${websiteUrl}`);

    // Get the user's AEO project
    const { data: project, error: projectError } = await supabase
      .from("aeo_projects")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (projectError || !project) {
      console.log("[auto-generate-aeo] No project found, skipping auto-generation");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No project found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandName = project.brand_name || new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.split(".")[0];

    // Generate initial AEO opportunities based on the website
    const opportunityQuestions = generateInitialQuestions(brandName, project.description || "", language);

    // Insert opportunities
    const opportunitiesToInsert = opportunityQuestions.map((q) => ({
      user_id: userId,
      project_id: project.id,
      question: q.question,
      platform: "chatgpt",
      query_type: q.type,
      citation_potential: Math.floor(Math.random() * 30) + 60,
      difficulty: q.difficulty || "medium",
      status: "pending",
      brand_mention: brandName,
    }));

    const { data: insertedOpportunities, error: insertError } = await supabase
      .from("ai_opportunities")
      .insert(opportunitiesToInsert)
      .select();

    if (insertError) {
      console.error("[auto-generate-aeo] Error inserting opportunities:", insertError);
      throw insertError;
    }

    console.log(`[auto-generate-aeo] Created ${insertedOpportunities?.length || 0} opportunities`);

    // Generate initial AEO answers for the first few opportunities
    const answersToGenerate = opportunitiesToInsert.slice(0, 5);
    const answersToInsert = answersToGenerate.map((opp) => ({
      user_id: userId,
      project_id: project.id,
      question: opp.question,
      direct_answer: generatePlaceholderAnswer(opp.question, brandName, language),
      platform: "chatgpt",
      query_type: opp.query_type,
      citation_potential: Math.floor(Math.random() * 20) + 70,
      brand_name: brandName,
      brand_mention: brandName,
      status: "draft",
      is_published: false,
    }));

    const { data: insertedAnswers, error: answersError } = await supabase
      .from("ai_answers")
      .insert(answersToInsert)
      .select();

    if (answersError) {
      console.error("[auto-generate-aeo] Error inserting answers:", answersError);
    } else {
      console.log(`[auto-generate-aeo] Created ${insertedAnswers?.length || 0} draft answers`);
    }

    return new Response(JSON.stringify({
      success: true,
      opportunities_created: insertedOpportunities?.length || 0,
      answers_created: insertedAnswers?.length || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[auto-generate-aeo] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateInitialQuestions(brandName: string, description: string, language: string): Array<{ question: string; type: string; difficulty: string }> {
  const frQuestions = [
    { question: `Qu'est-ce que ${brandName} et quels sont ses services ?`, type: "informational", difficulty: "easy" },
    { question: `Pourquoi choisir ${brandName} ?`, type: "commercial", difficulty: "medium" },
    { question: `Quels sont les avis sur ${brandName} ?`, type: "informational", difficulty: "medium" },
    { question: `Comment contacter ${brandName} ?`, type: "navigational", difficulty: "easy" },
    { question: `Quels sont les tarifs de ${brandName} ?`, type: "commercial", difficulty: "medium" },
    { question: `${brandName} est-il fiable ?`, type: "informational", difficulty: "medium" },
    { question: `Quelles sont les alternatives à ${brandName} ?`, type: "commercial", difficulty: "hard" },
    { question: `Comment fonctionne ${brandName} ?`, type: "informational", difficulty: "easy" },
  ];

  const enQuestions = [
    { question: `What is ${brandName} and what services do they offer?`, type: "informational", difficulty: "easy" },
    { question: `Why choose ${brandName}?`, type: "commercial", difficulty: "medium" },
    { question: `What are the reviews for ${brandName}?`, type: "informational", difficulty: "medium" },
    { question: `How to contact ${brandName}?`, type: "navigational", difficulty: "easy" },
    { question: `What are ${brandName}'s prices?`, type: "commercial", difficulty: "medium" },
    { question: `Is ${brandName} reliable?`, type: "informational", difficulty: "medium" },
    { question: `What are the alternatives to ${brandName}?`, type: "commercial", difficulty: "hard" },
    { question: `How does ${brandName} work?`, type: "informational", difficulty: "easy" },
  ];

  return language === "fr" ? frQuestions : enQuestions;
}

function generatePlaceholderAnswer(question: string, brandName: string, language: string): string {
  if (language === "fr") {
    return `${brandName} est une solution innovante qui répond à cette question. Pour obtenir une réponse complète et personnalisée, nous vous invitons à consulter notre site ou à nous contacter directement. Notre équipe sera ravie de vous accompagner.`;
  }
  return `${brandName} is an innovative solution that addresses this question. For a complete and personalized answer, we invite you to visit our website or contact us directly. Our team will be happy to assist you.`;
}
