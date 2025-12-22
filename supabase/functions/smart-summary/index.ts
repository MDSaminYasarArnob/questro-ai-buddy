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

async function callGeminiAPI(geminiApiKey: string, text: string | null, pdfBase64: string | null) {
  const parts: any[] = [{ text: systemPrompt }];

  if (pdfBase64) {
    parts.push({
      inline_data: {
        mime_type: "application/pdf",
        data: pdfBase64
      }
    });
    parts.push({ text: "Analyze this PDF document and provide the summary in the specified JSON format." });
  } else if (text) {
    parts.push({ text: `Analyze this text and provide the summary in the specified JSON format:\n\n${text}` });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  return response;
}

async function callLovableAI(text: string | null, pdfBase64: string | null) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  let userContent = "";
  if (pdfBase64) {
    // For PDF, we need to describe it since Lovable AI doesn't support inline PDF
    userContent = "I have uploaded a PDF document. Please analyze it and provide a comprehensive summary. Note: Due to technical limitations, I'm providing text extracted from the PDF instead of the raw file.";
  } else if (text) {
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

  return response;
}

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get user's Gemini API key
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .single();

    let responseText: string | null = null;
    let usedFallback = false;

    // Try Gemini API first if user has a key
    if (apiKeyData?.api_key) {
      console.log('Trying user Gemini API key...');
      const geminiResponse = await callGeminiAPI(apiKeyData.api_key, text, pdfBase64);

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      } else if (geminiResponse.status === 429) {
        console.log('Gemini API rate limited, falling back to Lovable AI...');
        usedFallback = true;
      } else if (geminiResponse.status === 400) {
        const errorText = await geminiResponse.text();
        if (errorText.includes('API_KEY_INVALID')) {
          console.log('Invalid Gemini API key, falling back to Lovable AI...');
          usedFallback = true;
        } else {
          throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }
      } else {
        console.error('Gemini API error:', geminiResponse.status);
        usedFallback = true;
      }
    } else {
      console.log('No Gemini API key found, using Lovable AI...');
      usedFallback = true;
    }

    // Fallback to Lovable AI
    if (usedFallback || !responseText) {
      console.log('Using Lovable AI gateway...');
      const lovableResponse = await callLovableAI(text, pdfBase64);

      if (!lovableResponse.ok) {
        const errorText = await lovableResponse.text();
        console.error('Lovable AI error:', lovableResponse.status, errorText);
        
        if (lovableResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'AI service rate limit exceeded. Please try again in a few moments.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (lovableResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: 'AI service credits exhausted. Please try again later.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`AI gateway error: ${lovableResponse.status}`);
      }

      const data = await lovableResponse.json();
      responseText = data.choices?.[0]?.message?.content;
    }

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
