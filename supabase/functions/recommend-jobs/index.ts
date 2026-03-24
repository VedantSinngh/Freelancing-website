import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user profile and skills
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user_id)
      .single();

    // Fetch user's bid history (projects they've bid on or worked on)
    const { data: bids } = await supabase
      .from("bids")
      .select("project_id, status, projects(*)")
      .eq("freelancer_id", user_id)
      .limit(10);

    // Fetch all open projects
    const { data: openProjects } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "open")
      .limit(50);

    // Prepare context for AI
    const userContext = {
      skills: profile?.skills || [],
      hourly_rate: profile?.hourly_rate || 0,
      position: profile?.position || "Unknown",
      past_projects: bids?.map((b: any) => ({
        title: b.projects?.title,
        skills_required: b.projects?.skills_required,
        status: b.status,
      })) || [],
    };

    const projectsToAnalyze = openProjects?.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      skills_required: p.skills_required || [],
      budget: p.budget,
      deadline: p.deadline,
    })) || [];

    // Call Lovable AI for recommendations
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an AI job matching expert. Analyze user skills and project history to recommend the most relevant open projects. 
            Consider skill match, budget alignment, past project types, and career growth opportunities.
            Return a JSON array of recommended project IDs with relevance scores (0-100) and brief reasons.
            Format: [{"project_id": "uuid", "score": 95, "reason": "Perfect skill match..."}]
            Recommend up to 5 projects, ordered by score.`,
          },
          {
            role: "user",
            content: `User Profile: ${JSON.stringify(userContext)}\n\nAvailable Projects: ${JSON.stringify(projectsToAnalyze)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0]?.message?.content || "[]";
    
    // Parse AI response
    let recommendations;
    try {
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      recommendations = [];
    }

    // Enrich recommendations with full project details
    const enrichedRecommendations = recommendations.map((rec: any) => {
      const project = openProjects?.find((p: any) => p.id === rec.project_id);
      return {
        ...rec,
        project,
      };
    }).filter((rec: any) => rec.project);

    return new Response(
      JSON.stringify({ recommendations: enrichedRecommendations }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in recommend-jobs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
