import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are an expert content analyzer and summarizer. Analyze the provided content and generate:

1. **Short Summary**: A concise 2-3 paragraph summary of the main content.

2. **Key Points**: Extract 5-10 most important points/takeaways as a JSON array of strings.

3. **Mind Map**: Create a text-based mind map showing the hierarchical structure of ideas using this format:
   📌 Main Topic
   ├── Subtopic 1
   │   ├── Detail 1.1
   │   └── Detail 1.2
   ├── Subtopic 2
   │   ├── Detail 2.1
   │   └── Detail 2.2
   └── Subtopic 3

4. **Chapter-wise Breakdown**: Divide the content into logical sections/chapters with titles and summaries.

RESPOND IN THE SAME LANGUAGE AS THE INPUT CONTENT.

Return your response as a valid JSON object with this exact structure:
{
  "shortSummary": "...",
  "keyPoints": ["point1", "point2", ...],
  "mindMap": "...",
  "chapterBreakdown": [
    {"title": "Chapter 1 Title", "content": "Summary of chapter 1..."},
    {"title": "Chapter 2 Title", "content": "Summary of chapter 2..."}
  ]
}

IMPORTANT: Return ONLY the JSON object, no markdown code blocks, no extra text.`;

function parseAIResponse(responseText: string) {
  let cleanedText = responseText.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.slice(7);
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.slice(3);
  }
  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.slice(0, -3);
  }
  cleanedText = cleanedText.trim();

  try {
    return JSON.parse(cleanedText);
  } catch (parseError) {
    console.error('Failed to parse AI response:', cleanedText);
    return {
      shortSummary: responseText,
      keyPoints: ["Unable to extract structured key points"],
      mindMap: "📌 Content\n└── See summary above",
      chapterBreakdown: [{ title: "Content", content: responseText }]
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, pdfBase64 } = await req.json();

    if (!text && !pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        JSON.stringify({ error: 'Invalid authentication' }),
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

    console.log('Using Lovable AI gateway...');

    let userContent: any;
    if (pdfBase64) {
      userContent = [
        { type: 'text', text: 'Analyze this PDF document and provide the summary in the specified JSON format.' },
        {
          type: 'image_url',
          image_url: {
            url: `data:application/pdf;base64,${pdfBase64}`
          }
        }
      ];
    } else {
      userContent = `Analyze this text and provide the summary in the specified JSON format:\n\n${text}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI service rate limit exceeded. Please try again in a few moments.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits exhausted. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response from AI');
    }

    const result = parseAIResponse(responseText);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Smart summary error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate summary';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
