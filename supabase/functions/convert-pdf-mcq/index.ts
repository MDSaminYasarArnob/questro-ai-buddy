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
    const { pdfBase64, mcqCount = 10 } = await req.json();
    const questionCount = Math.min(50, Math.max(1, parseInt(mcqCount) || 10));
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing PDF to generate ${questionCount} MCQs...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this PDF document and generate exactly ${questionCount} multiple choice questions (MCQs) based on the key concepts. Return the response in this exact JSON format only, no other text:\n\n{"questions":[{"id":1,"question":"Question text here?","options":{"A":"Option A","B":"Option B","C":"Option C","D":"Option D"},"correctAnswer":"A","explanation":"Brief explanation of why this is correct"}]}\n\nRequirements:\n1. Generate exactly ${questionCount} questions\n2. Each question must have exactly 4 options (A, B, C, D)\n3. correctAnswer must be one of: A, B, C, D\n4. Include a brief explanation for each correct answer\n5. Make questions challenging but fair\n6. Cover different topics from the document\n7. Return ONLY valid JSON, no markdown or other text`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Lovable AI error:', response.status, error);
      
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
        JSON.stringify({ error: 'Failed to convert PDF to MCQs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', content);

    // Parse the JSON response
    let questions;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        questions = parsed.questions;
      } else {
        // Try parsing directly
        const parsed = JSON.parse(content);
        questions = parsed.questions;
      }
      
      // Validate the structure
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No questions found');
      }
      
      // Ensure each question has required fields
      questions = questions.map((q: any, idx: number) => ({
        id: idx + 1,
        question: q.question || `Question ${idx + 1}`,
        options: {
          A: q.options?.A || 'Option A',
          B: q.options?.B || 'Option B',
          C: q.options?.C || 'Option C',
          D: q.options?.D || 'Option D',
        },
        correctAnswer: ['A', 'B', 'C', 'D'].includes(q.correctAnswer) ? q.correctAnswer : 'A',
        explanation: q.explanation || 'No explanation provided.'
      }));
      
      // Limit to requested count
      questions = questions.slice(0, questionCount);
      
    } catch (parseError) {
      console.error('Failed to parse MCQ response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse MCQ response. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated', questions.length, 'questions');

    return new Response(
      JSON.stringify({ questions }),
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
