import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's skill analytics
    const { data: skills, error: skillsError } = await supabase
      .from('skill_analytics')
      .select('*')
      .eq('user_id', user.id);

    if (skillsError) {
      console.error('Error fetching skills:', skillsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch skills' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's project history
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*, bids!inner(*)')
      .eq('bids.freelancer_id', user.id)
      .eq('bids.status', 'accepted');

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('skills')
      .eq('user_id', user.id)
      .maybeSingle();

    // Prepare data for AI analysis
    const analysisData = {
      skills: skills || [],
      projects: projects || [],
      profileSkills: profile?.skills || [],
      totalProjects: projects?.length || 0,
    };

    // Call Lovable AI for insights
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a career analytics expert. Analyze user skill data and provide actionable insights. 
            Focus on:
            1. Skill strengths and weaknesses
            2. Market demand for skills
            3. Skill development recommendations
            4. Career growth opportunities
            Keep insights concise and actionable.`
          },
          {
            role: 'user',
            content: `Analyze this freelancer's skill data and provide insights:
            
Skills tracked: ${JSON.stringify(analysisData.skills.map(s => ({
  skill: s.skill,
  proficiency: s.proficiency_level,
  projects: s.projects_completed,
  earnings: s.total_earnings
})))}

Profile skills: ${analysisData.profileSkills.join(', ')}
Total projects completed: ${analysisData.totalProjects}

Provide:
1. Top 3 strongest skills
2. Skills needing improvement
3. 3 specific recommendations for skill development
4. Market trends relevant to their skills`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_skill_insights',
              description: 'Provide structured skill analysis and recommendations',
              parameters: {
                type: 'object',
                properties: {
                  strongestSkills: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        skill: { type: 'string' },
                        reason: { type: 'string' }
                      },
                      required: ['skill', 'reason']
                    }
                  },
                  improvementAreas: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        skill: { type: 'string' },
                        suggestion: { type: 'string' }
                      },
                      required: ['skill', 'suggestion']
                    }
                  },
                  recommendations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                      },
                      required: ['title', 'description', 'priority']
                    }
                  },
                  marketTrends: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  }
                },
                required: ['strongestSkills', 'improvementAreas', 'recommendations', 'marketTrends']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'provide_skill_insights' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ error: 'No insights generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      skills: analysisData.skills,
      insights,
      summary: {
        totalSkills: analysisData.skills.length,
        totalProjects: analysisData.totalProjects,
        averageProficiency: analysisData.skills.length > 0
          ? (analysisData.skills.reduce((sum, s) => sum + s.proficiency_level, 0) / analysisData.skills.length).toFixed(1)
          : 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-skills function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});