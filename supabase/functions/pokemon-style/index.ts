// Edge Function: pokemon-style
// Analisa um Pokémon com a IA da Groq e devolve um estilo visual EXCLUSIVO
// (paleta, marca-d'água, frase e efeito) usado nas fichas em PDF e Word.
//
// A chave fica APENAS em Supabase > Edge Functions > Secrets (GROQ_API_KEY).
// Nada de chave neste arquivo nem em qualquer lugar do repositório.
//
// Deploy: supabase functions deploy pokemon-style --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELO = "llama-3.3-70b-versatile";

/** Efeitos que o PDF e o Word sabem desenhar. A IA precisa escolher um destes. */
const EFEITOS = [
  "raios", "chamas", "bolhas", "folhas", "cristais", "estrelas",
  "nevoa", "ondas", "circuito", "petalas", "fragmentos", "espinhos",
] as const;

const FONTES = ["helvetica", "times", "courier"] as const;

type Efeito = (typeof EFEITOS)[number];
type Fonte = (typeof FONTES)[number];

type Paleta = {
  primaria: string;
  secundaria: string;
  destaque: string;
  fundo: string;
  texto: string;
};

type Estilo = {
  pokemon_id: number;
  nome: string;
  tipos: string[];
  titulo: string;
  frase: string;
  efeito: Efeito;
  fonte: Fonte;
  marca: { texto: string; opacidade: number; rotacao: number };
  paleta: Paleta;
  origem: "groq" | "fallback";
  modelo?: string;
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Utilidades de validação: nunca confiamos cegamente no que a IA devolve.
// ---------------------------------------------------------------------------

function normalizarHex(valor: unknown, alternativa: string): string {
  let cor = String(valor ?? "").trim();
  if (/^[0-9a-fA-F]{6}$/.test(cor)) cor = "#" + cor;
  if (/^#[0-9a-fA-F]{3}$/.test(cor)) {
    cor = "#" + cor.slice(1).split("").map((c) => c + c).join("");
  }
  return /^#[0-9a-fA-F]{6}$/.test(cor) ? cor.toLowerCase() : alternativa;
}

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function escurecer(hex: string, fator: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ajusta = (v: number) => Math.max(0, Math.min(255, Math.round(v * fator)));
  const r = ajusta((n >> 16) & 255), g = ajusta((n >> 8) & 255), b = ajusta(n & 255);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function limitarTexto(valor: unknown, maximo: number, alternativa: string): string {
  const texto = String(valor ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!texto) return alternativa;
  return texto.length > maximo ? texto.slice(0, maximo).trim() : texto;
}

function numeroEntre(valor: unknown, min: number, max: number, alternativa: number): number {
  const n = Number(valor);
  if (!Number.isFinite(n)) return alternativa;
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
}

/** Paleta de segurança por tipo, usada quando a Groq falha ou está fora do ar. */
const PALETA_TIPO: Record<string, [string, string, Efeito]> = {
  normal: ["#7b8495", "#a9b0bd", "estrelas"],
  fire: ["#d74632", "#ff9a42", "chamas"],
  water: ["#2877cf", "#62b9ee", "bolhas"],
  electric: ["#d5a500", "#ffe36b", "raios"],
  grass: ["#3f9b59", "#9ad968", "folhas"],
  ice: ["#3c9ab8", "#a5e8f2", "cristais"],
  fighting: ["#b6443a", "#e78259", "fragmentos"],
  poison: ["#8b4ab1", "#d28cdf", "bolhas"],
  ground: ["#a87434", "#e5c66c", "fragmentos"],
  flying: ["#6d7cc8", "#b4bdf5", "nevoa"],
  psychic: ["#cf4e83", "#ff9fc5", "estrelas"],
  bug: ["#719b2e", "#b7d65d", "folhas"],
  rock: ["#9e7d3c", "#d7ba67", "fragmentos"],
  ghost: ["#624d91", "#a58bce", "nevoa"],
  dragon: ["#5451c6", "#a494ff", "cristais"],
  dark: ["#4b5266", "#9299ad", "nevoa"],
  steel: ["#6b8494", "#b3c7d3", "circuito"],
  fairy: ["#c75d9c", "#f3a9d2", "petalas"],
};

function estiloFallback(dados: DadosPokemon): Estilo {
  const tipo = dados.tipos[0] || "normal";
  const base = PALETA_TIPO[tipo] || PALETA_TIPO.normal;
  // Pequena variação determinística pelo número: nenhuma ficha fica idêntica.
  const desvio = 1 - ((dados.id % 7) * 0.02);
  return {
    pokemon_id: dados.id,
    nome: dados.nome,
    tipos: dados.tipos,
    titulo: `REGISTRO ${tipo.toUpperCase()}`,
    frase: "Treine. Descubra. Evolua.",
    efeito: base[2],
    fonte: FONTES[dados.id % FONTES.length],
    marca: {
      texto: dados.nome.toUpperCase(),
      opacidade: 0.08,
      rotacao: 18 + (dados.id % 5) * 5,
    },
    paleta: {
      primaria: escurecer(base[0], desvio),
      secundaria: base[1],
      destaque: escurecer(base[0], 0.75),
      fundo: "#f7f5fd",
      texto: "#20243b",
    },
    origem: "fallback",
  };
}

// ---------------------------------------------------------------------------
// PokéAPI: buscamos os dados no servidor para a IA analisar o Pokémon real.
// ---------------------------------------------------------------------------

type DadosPokemon = {
  id: number;
  nome: string;
  tipos: string[];
  habilidades: string[];
  altura: number;
  peso: number;
  stats: Record<string, number>;
  cor: string;
  habitat: string;
  lendario: boolean;
  mitico: boolean;
  geracao: string;
  descricao: string;
};

async function carregarPokemon(chave: string): Promise<DadosPokemon> {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(chave)}`);
  if (!res.ok) throw new Error("Pokémon não encontrado na PokéAPI.");
  const p = await res.json();

  const stats: Record<string, number> = {};
  for (const s of p.stats || []) stats[s.stat.name] = s.base_stat;

  const dados: DadosPokemon = {
    id: p.id,
    nome: p.name,
    tipos: (p.types || []).map((t: { type: { name: string } }) => t.type.name),
    habilidades: (p.abilities || []).map((a: { ability: { name: string } }) => a.ability.name),
    altura: (p.height || 0) / 10,
    peso: (p.weight || 0) / 10,
    stats,
    cor: "",
    habitat: "",
    lendario: false,
    mitico: false,
    geracao: "",
    descricao: "",
  };

  // A espécie traz cor, habitat e a descrição oficial — ótimo material para a IA.
  try {
    const especieRes = await fetch(p.species.url);
    if (especieRes.ok) {
      const especie = await especieRes.json();
      dados.cor = especie.color?.name || "";
      dados.habitat = especie.habitat?.name || "";
      dados.lendario = !!especie.is_legendary;
      dados.mitico = !!especie.is_mythical;
      dados.geracao = especie.generation?.name || "";
      const texto = (especie.flavor_text_entries || []).find(
        (f: { language: { name: string } }) => f.language.name === "pt" || f.language.name === "pt-BR",
      ) || (especie.flavor_text_entries || []).find(
        (f: { language: { name: string } }) => f.language.name === "en",
      );
      dados.descricao = String(texto?.flavor_text || "").replace(/[\f\n\r]+/g, " ").trim();
    }
  } catch (_) {
    // Sem a espécie a IA ainda consegue trabalhar com tipos e atributos.
  }

  return dados;
}

// ---------------------------------------------------------------------------
// Groq
// ---------------------------------------------------------------------------

async function analisarComGroq(dados: DadosPokemon, chave: string): Promise<Estilo> {
  const prompt = `Você é diretor de arte da Pokédex. Analise ESTE Pokémon e crie uma identidade visual EXCLUSIVA para a ficha dele em PDF e Word.

Dados:
- Nome: ${dados.nome}
- Número: ${dados.id}
- Tipos: ${dados.tipos.join(", ") || "desconhecido"}
- Habilidades: ${dados.habilidades.join(", ") || "desconhecidas"}
- Altura: ${dados.altura} m | Peso: ${dados.peso} kg
- Atributos: ${JSON.stringify(dados.stats)}
- Cor da espécie: ${dados.cor || "não informada"}
- Habitat: ${dados.habitat || "não informado"}
- Geração: ${dados.geracao || "não informada"}
- Lendário: ${dados.lendario ? "sim" : "não"} | Mítico: ${dados.mitico ? "sim" : "não"}
- Descrição oficial: ${dados.descricao || "não informada"}

Regras obrigatórias:
1. As cores devem refletir a aparência REAL deste Pokémon, não apenas o tipo. Dois Pokémon diferentes nunca devem receber a mesma paleta.
2. "fundo" precisa ser bem claro (papel) e "texto" bem escuro: a ficha é impressa.
3. "titulo" tem no máximo 28 caracteres, em maiúsculas, é o selo do cabeçalho (ex.: "ARQUIVO VULCÂNICO").
4. "frase" tem no máximo 60 caracteres, em português, é o lema do rodapé, inspirado neste Pokémon.
5. "marca_texto" tem no máximo 14 caracteres, em maiúsculas: a marca-d'água gigante do fundo.
6. "efeito" deve ser exatamente um destes: ${EFEITOS.join(", ")}.
7. "fonte" deve ser exatamente uma destas: ${FONTES.join(", ")}.

Responda SOMENTE com JSON válido, sem markdown e sem comentários:
{"titulo":"","frase":"","efeito":"","fonte":"","marca_texto":"","marca_opacidade":0.08,"marca_rotacao":28,"paleta":{"primaria":"#rrggbb","secundaria":"#rrggbb","destaque":"#rrggbb","fundo":"#rrggbb","texto":"#rrggbb"}}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      temperature: 0.85,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Você responde somente com JSON válido, sem markdown." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Groq respondeu ${res.status}`);
  const json = await res.json();
  const conteudo = json.choices?.[0]?.message?.content || "";
  const bruto = conteudo.match(/\{[\s\S]*\}/);
  if (!bruto) throw new Error("A IA não devolveu JSON.");

  const ia = JSON.parse(bruto[0]);
  const reserva = estiloFallback(dados);
  const p = ia.paleta || {};

  const paleta: Paleta = {
    primaria: normalizarHex(p.primaria, reserva.paleta.primaria),
    secundaria: normalizarHex(p.secundaria, reserva.paleta.secundaria),
    destaque: normalizarHex(p.destaque, reserva.paleta.destaque),
    fundo: normalizarHex(p.fundo, reserva.paleta.fundo),
    texto: normalizarHex(p.texto, reserva.paleta.texto),
  };

  // A ficha é impressa: garantimos legibilidade mesmo se a IA exagerar.
  if (luminancia(paleta.fundo) < 0.75) paleta.fundo = "#f7f5fd";
  if (contraste(paleta.texto, paleta.fundo) < 7) paleta.texto = "#20243b";
  // O cabeçalho tem texto branco por cima da cor primária.
  if (contraste(paleta.primaria, "#ffffff") < 3.2) paleta.primaria = escurecer(paleta.primaria, 0.55);
  if (contraste(paleta.destaque, paleta.fundo) < 3) paleta.destaque = escurecer(paleta.destaque, 0.6);

  const efeito = EFEITOS.includes(ia.efeito) ? (ia.efeito as Efeito) : reserva.efeito;
  const fonte = FONTES.includes(ia.fonte) ? (ia.fonte as Fonte) : reserva.fonte;

  return {
    pokemon_id: dados.id,
    nome: dados.nome,
    tipos: dados.tipos,
    titulo: limitarTexto(ia.titulo, 28, reserva.titulo).toUpperCase(),
    frase: limitarTexto(ia.frase, 60, reserva.frase),
    efeito,
    fonte,
    marca: {
      texto: limitarTexto(ia.marca_texto, 14, reserva.marca.texto).toUpperCase(),
      opacidade: numeroEntre(ia.marca_opacidade, 0.03, 0.2, 0.08),
      rotacao: numeroEntre(ia.marca_rotacao, -45, 45, 28),
    },
    paleta,
    origem: "groq",
    modelo: MODELO,
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método não permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const corpo = await req.json().catch(() => ({}));
    const chave = String(corpo.pokemon ?? corpo.id ?? corpo.nome ?? "").trim().toLowerCase();
    const recriar = corpo.recriar === true;
    if (!chave) return response({ error: "Informe o nome ou número do Pokémon." }, 400);
    if (!/^[a-z0-9][a-z0-9-]{0,30}$/.test(chave)) return response({ error: "Pokémon inválido." }, 400);

    // 1) Cache: se o estilo já existe, devolvemos na hora e não gastamos IA.
    if (!recriar) {
      const busca = /^\d+$/.test(chave)
        ? admin.from("pokemon_styles").select("estilo").eq("pokemon_id", Number(chave)).maybeSingle()
        : admin.from("pokemon_styles").select("estilo").eq("nome", chave).maybeSingle();
      const { data: cache } = await busca;
      if (cache?.estilo) {
        return response({ estilo: cache.estilo, cache: true });
      }
    }

    // 2) Dados reais do Pokémon.
    const dados = await carregarPokemon(chave);

    // 3) Análise pela Groq (com queda suave para o estilo por tipo).
    const groqKey = Deno.env.get("GROQ_API_KEY");
    let estilo: Estilo;
    let aviso: string | undefined;

    if (!groqKey) {
      estilo = estiloFallback(dados);
      aviso = "GROQ_API_KEY não configurada nos Secrets: usando estilo padrão por tipo.";
    } else {
      try {
        estilo = await analisarComGroq(dados, groqKey);
      } catch (erro) {
        console.error("Falha na Groq:", erro);
        estilo = estiloFallback(dados);
        aviso = "A IA está indisponível agora: usando estilo padrão por tipo.";
      }
    }

    // 4) Cache no banco (só a Edge Function grava, com service_role).
    const { error: erroGravacao } = await admin.from("pokemon_styles").upsert({
      pokemon_id: estilo.pokemon_id,
      nome: estilo.nome,
      tipos: estilo.tipos,
      titulo: estilo.titulo,
      frase: estilo.frase,
      efeito: estilo.efeito,
      fonte: estilo.fonte,
      marca_texto: estilo.marca.texto,
      marca_opacidade: estilo.marca.opacidade,
      marca_rotacao: estilo.marca.rotacao,
      cor_primaria: estilo.paleta.primaria,
      cor_secundaria: estilo.paleta.secundaria,
      cor_destaque: estilo.paleta.destaque,
      cor_fundo: estilo.paleta.fundo,
      cor_texto: estilo.paleta.texto,
      estilo,
      origem: estilo.origem,
      modelo: estilo.modelo ?? null,
    }, { onConflict: "pokemon_id" });

    if (erroGravacao) console.error("Falha ao gravar o cache:", erroGravacao);

    return response({ estilo, cache: false, aviso });
  } catch (erro) {
    console.error(erro);
    return response({ error: erro instanceof Error ? erro.message : "Erro ao gerar o estilo." }, 500);
  }
});
