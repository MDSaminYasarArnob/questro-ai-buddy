import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User authentication failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { topic, type } = await req.json();

    if (!topic || !type) {
      return new Response(
        JSON.stringify({ error: "Topic and type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an educational diagram generator for school students.

Task:
Generate a ${type} for the topic: "${topic}".

CRITICAL RULES:
- Output ONLY the required structured format
- Use short, clear, exam-friendly terms
- No explanations before or after
- No markdown code blocks (no \`\`\`)
- No extra text or commentary
- Keep it simple and educational

OUTPUT FORMAT BY TYPE:

If type = flowchart:
- Use Mermaid.js flowchart syntax
- Direction: Top to Bottom (TD)
- Use SHORT labels (2-5 words max) inside nodes
- Every node MUST have text inside: A[Text Here] or B{Text Here}
- Start directly with: flowchart TD
- Example format:
flowchart TD
    A[Start Process] --> B{Decision Point}
    B -->|Yes| C[Action One]
    B -->|No| D[Action Two]
    C --> E[End]
    D --> E

If type = mindmap:
- Use Mermaid.js mindmap syntax
- Central topic first, then branches
- Keep 2-3 levels of depth
- Use concise keywords (2-4 words)
- Start directly with: mindmap
- Example format:
mindmap
  root((Main Topic))
    Branch One
      Sub item A
      Sub item B
    Branch Two
      Sub item C
    Branch Three

If type = diagram:
- Output numbered labels only
- Each label should be 2-6 words
- Format each on new line: 1. Label Name
- Suitable for labeling parts of a diagram
- Example:
1. Cell Membrane
2. Nucleus
3. Cytoplasm

If type = conceptmap:
- Show relationships between concepts
- Format: Concept (relationship)→ Related Concept
- Each relationship on new line
- Use clear relationship words in parentheses
- Example:
Sun (provides energy to)→ Plants
Plants (produce)→ Oxygen
Animals (breathe)→ Oxygen

Level: School student (simple, clear, educational)`;

    console.log(`Generating ${type} for topic: ${topic}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a ${type} for: ${topic}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Clean up the content - remove markdown code blocks if present
    content = content.replace(/```mermaid\n?/gi, "").replace(/```\n?/g, "").trim();

    console.log("Generated diagram content:", content);

    return new Response(
      JSON.stringify({ diagram: content, type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating diagram:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
