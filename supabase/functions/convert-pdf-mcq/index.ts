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
    const { pdfBase64, mcqCount = 10 } = await req.json();
    const questionCount = Math.min(50, Math.max(1, parseInt(mcqCount) || 10));

    // Get user's API key from the database
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Please sign in to use this feature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (keyError || !apiKeyData?.api_key) {
      return new Response(
        JSON.stringify({ error: 'Please add your Gemini API key in Settings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = apiKeyData.api_key;

    console.log(`Processing PDF to generate ${questionCount} MCQs...`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Analyze this PDF document and generate exactly ${questionCount} multiple choice questions (MCQs) based on the key concepts. Return the response in this exact JSON format only, no other text:

{"questions":[{"id":1,"question":"Question text here?","options":{"A":"Option A","B":"Option B","C":"Option C","D":"Option D"},"correctAnswer":"A","explanation":"Brief explanation of why this is correct"}]}

Requirements:
1. Generate exactly ${questionCount} questions
2. Each question must have exactly 4 options (A, B, C, D)
3. correctAnswer must be one of: A, B, C, D
4. Include a brief explanation for each correct answer
5. Make questions challenging but fair
6. Cover different topics from the document
7. Return ONLY valid JSON, no markdown or other text`
              },
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: pdfBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', response.status, error);
      
      if (response.status === 400 && error.includes('API_KEY_INVALID')) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key. Please check your Gemini API key in Settings.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to convert PDF. Please check your API key.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('AI Response:', content);

    // Parse the JSON response
    let questions;
    try {
      const jsonMatch = content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        questions = parsed.questions;
      } else {
        const parsed = JSON.parse(content);
        questions = parsed.questions;
      }
      
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No questions found');
      }
      
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
