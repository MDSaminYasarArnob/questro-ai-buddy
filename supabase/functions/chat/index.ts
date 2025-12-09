import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build content based on whether there's a file
    let apiMessages: any[];
    
    const systemPrompt = `You are Questro AI - an extremely intelligent and capable AI assistant designed to solve ANY question across all domains.

**CRITICAL LANGUAGE RULE:**
- ALWAYS detect the language of the user's message and respond in that SAME language
- If the user writes in Hindi, respond in Hindi
- If the user writes in Spanish, respond in Spanish
- If the user writes in any other language, respond in that language
- Only use English if the user writes in English

**Academic Subjects:**
- Mathematics (algebra, calculus, statistics, geometry, proofs)
- Physics, Chemistry, Biology (equations, concepts, problem-solving)
- Computer Science (algorithms, data structures, coding problems)
- History, Geography, Economics, Literature

**Problem-Solving Approach:**
- Break down complex problems step-by-step
- Show your reasoning and working process
- Use LaTeX for mathematical notation: $inline$ or $$block$$
- Provide clear explanations that teach, not just answer
- If multiple approaches exist, mention the best one

**When analyzing images/documents:**
- Identify the type of problem (MCQ, calculation, diagram, etc.)
- Extract all relevant information
- Solve systematically with explanations

**Response Style:**
- Be thorough but concise
- Use formatting (headers, bullets, numbered lists) for clarity
- Always verify your answer makes sense
- If unsure, explain your reasoning and potential alternatives

Remember: You can solve ANY question - math, science, coding, logic puzzles, essay questions, and more. Think carefully and provide accurate, educational responses in the user's language.`;

    if (fileBase64 && fileType) {
      const lastMessage = messages[messages.length - 1];
      const messageText = lastMessage?.content || 'Analyze this file and solve any questions or problems shown.';
      
      const content = [
        {
          type: 'text',
          text: messageText
        },
        {
          type: 'image_url',
          image_url: {
            url: fileType === 'application/pdf' 
              ? `data:application/pdf;base64,${fileBase64}`
              : `data:${fileType};base64,${fileBase64}`
          }
        }
      ];

      apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.slice(0, -1),
        { role: 'user', content: content }
      ];
    } else {
      apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: apiMessages,
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
          JSON.stringify({ error: 'AI service quota exceeded. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to get AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the stream directly
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
