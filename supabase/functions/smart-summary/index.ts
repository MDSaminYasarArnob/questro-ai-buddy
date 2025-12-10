import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get user's API key
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

    // Get user's Gemini API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .single();

    if (apiKeyError || !apiKeyData?.api_key) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not found. Please add your API key in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = apiKeyData.api_key;

    // Build the prompt
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

    // Build request parts
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

    console.log('Calling Gemini API for smart summary...');

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'API rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 400 && errorText.includes('API_KEY_INVALID')) {
        return new Response(
          JSON.stringify({ error: 'Invalid Gemini API key. Please check your API key in Settings.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response received');

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response from AI');
    }

    // Parse JSON response - handle potential markdown code blocks
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

    let result;
    try {
      result = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedText);
      // Return a basic structure if parsing fails
      result = {
        shortSummary: responseText,
        keyPoints: ["Unable to extract structured key points"],
        mindMap: "📌 Content\n└── See summary above",
        chapterBreakdown: [{ title: "Content", content: responseText }]
      };
    }

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
