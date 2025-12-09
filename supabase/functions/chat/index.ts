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

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Please sign in to use the chat' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Gemini API key
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (keyError) {
      console.error('Error fetching API key:', keyError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKeyData?.api_key) {
      return new Response(
        JSON.stringify({ error: 'Please add your Gemini API key in Settings to use the chat' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = apiKeyData.api_key;

    const systemPrompt = `You are Questro AI - an intelligent AI assistant for solving questions across all domains.

**CRITICAL RULES:**
1. ALWAYS respond in the SAME language as the user's message
2. Give ONLY ONE clear, definitive answer - NEVER repeat or give multiple different answers
3. Be direct and concise - no redundancy

**Response Guidelines:**
- Break down problems step-by-step when needed
- Use LaTeX for math: $inline$ or $$block$$
- For MCQs: State the correct answer clearly ONCE, then explain why
- Never second-guess or contradict yourself
- If unsure, say so clearly rather than giving conflicting answers

**Subjects:** Math, Physics, Chemistry, Biology, Computer Science, History, Literature, and more.

Remember: ONE clear answer per question. No repetition. Match the user's language.`;

    // Build content based on whether there's a file
    let contents: any[];
    
    if (fileBase64 && fileType) {
      const lastMessage = messages[messages.length - 1];
      const messageText = lastMessage?.content || 'Analyze this file and solve any questions or problems shown.';
      
      contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'I understand. I will follow these guidelines.' }] },
        ...messages.slice(0, -1).map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        {
          role: 'user',
          parts: [
            { text: messageText },
            {
              inline_data: {
                mime_type: fileType,
                data: fileBase64
              }
            }
          ]
        }
      ];
    } else {
      contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'I understand. I will follow these guidelines.' }] },
        ...messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      ];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 400 && errorText.includes('API_KEY_INVALID')) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key. Please check your Gemini API key in Settings.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to get AI response. Please check your API key.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform Gemini SSE to OpenAI-compatible format
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  const openAIFormat = {
                    choices: [{
                      delta: { content: text }
                    }]
                  };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        console.error('Stream error:', e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
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
