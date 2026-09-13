// Supabase Edge Function: assist-word
// 基本情報技術者試験の用語を受け取り、読み方・分野・試験で問われる定義・
// 身近な例えに例えた説明をOpenAIに提案してもらう。
// デプロイ後、OPENAI_API_KEY を `supabase secrets set` で設定しておくこと。

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `あなたは基本情報技術者試験の勉強を手伝うアシスタントです。
ユーザーは専門用語を日常生活や身近な出来事の具体例に例えると理解しやすいという学習スタイルを持っています。
与えられた用語について、以下のJSON形式のみで日本語で回答してください。前置きや説明文は一切不要です。

重要なルール:
- analogyは絶対に省略しない。抽象的な概念や仕組みの用語でも、必ず日常生活・身近な出来事に例えて説明する。
- categoryは基本情報技術者試験のシラバス区分から最も近いものを1つ選ぶ。
  例: "テクノロジ系-ネットワーク", "テクノロジ系-データベース", "テクノロジ系-セキュリティ",
      "マネジメント系-プロジェクトマネジメント", "ストラテジ系-経営戦略" など。
- meaningは試験で問われる定義を簡潔に(2〜3文、日本語)。
- term_yomiは読み方(カタカナ/ひらがな)。英字略語はアルファベット読みでよい。

{
  "term_yomi": "用語の読み方",
  "category": "基本情報技術者試験のシラバス区分",
  "meaning": "試験で問われる定義(2〜3文、日本語)",
  "analogy": "日常生活・身近な出来事に例えた説明(2〜3文、日本語。省略不可)"
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { term, term_yomi } = await req.json();
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

    const userPrompt = term_yomi
      ? `用語: ${term} (読み方の参考: ${term_yomi})`
      : `用語: ${term}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI chat API error: ${errText}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content returned from OpenAI");

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
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
