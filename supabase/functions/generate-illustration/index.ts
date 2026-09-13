// Supabase Edge Function: generate-illustration
// 単語情報を受け取り、OpenAI Images APIでイラストを生成してStorageに保存し、公開URLを返す。
// デプロイ後、OPENAI_API_KEY を `supabase secrets set` で設定しておくこと。

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { term, meaning, analogy } = await req.json();
    if (!term) {
      return new Response(JSON.stringify({ error: "term is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const prompt = [
      `Simple, clean flat educational illustration representing the IT / computer science concept "${term}".`,
      meaning ? `Context: ${meaning}` : "",
      analogy ? `Visual hint: ${analogy}` : "",
      "Minimalist vector style, soft colors, no text or letters in the image, single clear subject, white background.",
    ]
      .filter(Boolean)
      .join(" ");

    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });

    if (!imageResponse.ok) {
      const errText = await imageResponse.text();
      throw new Error(`OpenAI images API error: ${errText}`);
    }

    const imageJson = await imageResponse.json();
    const b64 = imageJson.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image data returned from OpenAI");

    const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const fileName = `${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("illustrations")
      .upload(fileName, binary, { contentType: "image/png", upsert: false });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from("illustrations").getPublicUrl(fileName);

    return new Response(JSON.stringify({ url: publicUrlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
