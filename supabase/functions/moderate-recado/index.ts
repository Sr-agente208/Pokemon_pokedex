import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Decision = { status: "APPROVED" | "BLOCKED" | "REVIEW"; reason: string; confidence: number };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function parseDecision(text: string): Decision {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("A IA não retornou JSON.");
  const result = JSON.parse(match[0]);
  const validStatus = ["APPROVED", "BLOCKED", "REVIEW"].includes(result.status) ? result.status : "REVIEW";
  return { status: validStatus, reason: String(result.reason || "Análise inconclusiva."), confidence: Number(result.confidence || 0) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método não permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) return response({ error: "Moderação ainda não foi configurada." }, 503);

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return response({ error: "Faça login para enviar recados." }, 401);

    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: auth, error: authError } = await authClient.auth.getUser();
    if (authError || !auth.user) return response({ error: "Sessão inválida." }, 401);

    const { mensagem } = await req.json();
    const text = String(mensagem || "").trim();
    if (!text || text.length > 1000) return response({ error: "Escreva um recado de até 1000 caracteres." }, 400);

    const prompt = `Você é Treinador Nébula, moderador gentil de uma comunidade Pokémon com público jovem. Analise APENAS o recado abaixo. Bloqueie insultos direcionados, assédio, ameaça, conteúdo sexual, ódio, spam, golpes, links suspeitos e dados pessoais. Aprove conversa respeitosa sobre Pokémon. Responda SOMENTE JSON válido, sem markdown: {"status":"APPROVED|BLOCKED|REVIEW","reason":"motivo curto em português","confidence":0.0 a 1.0}. Recado: ${JSON.stringify(text)}`;
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", temperature: 0, messages: [{ role: "system", content: "Responda somente JSON." }, { role: "user", content: prompt }] }),
    });
    if (!groqResponse.ok) throw new Error("A moderação automática está indisponível agora.");
    const groqData = await groqResponse.json();
    const decision = parseDecision(groqData.choices?.[0]?.message?.content || "");

    const adminClient = createClient(url, serviceKey);
    await adminClient.from("moderation_events").insert({ user_id: auth.user.id, mensagem: text, status: decision.status, reason: decision.reason, confidence: decision.confidence });

    if (decision.status !== "APPROVED") return response({ status: decision.status, reason: decision.reason, confidence: decision.confidence });

    const { data: recado, error: insertError } = await authClient.from("recados").insert({ user_id: auth.user.id, mensagem: text }).select().single();
    if (insertError) throw insertError;
    return response({ status: "APPROVED", recado, confidence: decision.confidence });
  } catch (error) {
    console.error(error);
    return response({ error: error instanceof Error ? error.message : "Erro na moderação." }, 500);
  }
});
