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
    const { imageBase64 } = await req.json();

    console.log('Processing image with Lovable AI Gateway...');

    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [{
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `You are Questro AI - an expert problem solver capable of handling ANY academic question. Analyze the image and provide complete, detailed solutions.

**For Mathematical Problems:**
- State what the question asks
- Show ALL working steps using LaTeX notation ($..$ for inline, $$...$$ for blocks)
- Explain the reasoning behind each step
- Box or highlight the final answer

**For Science Problems:**
- Identify relevant concepts/formulas
- Apply step-by-step methodology
- Include units and significant figures

**For Multiple Choice:**
- Analyze each option
- Explain why the correct answer is right
- Explain why wrong options are incorrect

**For Diagrams/Graphs:**
- Describe what you observe
- Extract relevant data
- Apply appropriate analysis

Solve EVERY question in the image systematically. Make explanations educational and thorough.` 
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('AI Gateway error:', response.status, error);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const solution = data.choices?.[0]?.message?.content || 'No solution generated';

    console.log('Solution generated successfully');

    return new Response(
      JSON.stringify({ solution }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
