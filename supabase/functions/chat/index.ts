import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, fileBase64, fileType } = await req.json();
    
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Please sign in to use the chat' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI - no user API key needed
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are Questro AI - an expert academic AI tutor specialized in solving questions with 100% accuracy.

**CRITICAL ACCURACY RULES:**
1. THINK STEP-BY-STEP before answering - never rush to conclusions
2. DOUBLE-CHECK all calculations and reasoning before providing final answer
3. For math problems: Show complete working, verify the answer by substituting back
4. For MCQs: Evaluate EACH option carefully before selecting the correct one
5. ALWAYS respond in the SAME language as the user's question

**Problem-Solving Process:**
1. **Understand**: Read the question carefully, identify what is being asked
2. **Plan**: Determine the method/formula/concept to apply
3. **Solve**: Work through step-by-step with clear reasoning
4. **Verify**: Check your answer makes sense, verify calculations
5. **Present**: Give the final answer clearly

**Math & Science Guidelines:**
- Use LaTeX for all equations: $inline$ or $$block$$
- Show ALL steps in calculations - never skip steps
- State formulas before applying them
- Include units in physics/chemistry problems
- For word problems, define variables clearly

**MCQ Guidelines:**
- Analyze each option systematically
- Eliminate wrong options with reasoning
- State the CORRECT answer with letter/number
- Explain WHY it's correct and why others are wrong

**Subjects:** Mathematics, Physics, Chemistry, Biology, Computer Science, History, Geography, Literature, Economics, and more.

Remember: Accuracy is paramount. Take your time to think through problems carefully. One correct, well-explained answer is better than a quick wrong one.`;


    // Build messages for Lovable AI
    const aiMessages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const isLast = i === messages.length - 1;
      
      if (isLast && fileBase64 && fileType) {
        // For the last message with a file, include the image
        aiMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: m.content || 'Analyze this file and solve any questions or problems shown.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${fileType};base64,${fileBase64}`
              }
            }
          ]
        });
      } else {
        aiMessages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        });
      }
    }

    console.log('Calling Lovable AI gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to get AI response. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response directly
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Chat function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
