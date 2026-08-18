-- ============================================================================
-- Estilos únicos de ficha por Pokémon (gerados pela IA da Groq)
-- Execute este arquivo inteiro em Supabase > SQL Editor > New query.
-- NUNCA coloque chaves (GROQ_API_KEY, service_role, etc.) neste arquivo.
-- A chave da Groq fica somente em Supabase > Edge Functions > Secrets.
-- ============================================================================

create table if not exists public.pokemon_styles (
  pokemon_id integer primary key check (pokemon_id between 1 and 1025),
  nome text not null,
  tipos text[] not null default '{}',

  -- Identidade visual criada pela IA
  titulo text not null,
  frase text not null,
  efeito text not null,
  fonte text not null default 'helvetica' check (fonte in ('helvetica', 'times', 'courier')),

  -- Marca-d'água exclusiva
  marca_texto text not null,
  marca_opacidade numeric not null default 0.08 check (marca_opacidade between 0.02 and 0.35),
  marca_rotacao numeric not null default 28 check (marca_rotacao between -60 and 60),

  -- Paleta (validada como hexadecimal #rrggbb)
  cor_primaria text not null check (cor_primaria ~* '^#[0-9a-f]{6}$'),
  cor_secundaria text not null check (cor_secundaria ~* '^#[0-9a-f]{6}$'),
  cor_destaque text not null check (cor_destaque ~* '^#[0-9a-f]{6}$'),
  cor_fundo text not null check (cor_fundo ~* '^#[0-9a-f]{6}$'),
  cor_texto text not null check (cor_texto ~* '^#[0-9a-f]{6}$'),

  -- Documento completo devolvido para PDF/Word
  estilo jsonb not null,

  origem text not null default 'groq' check (origem in ('groq', 'fallback')),
  modelo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.pokemon_styles is
  'Cache de estilos de ficha (paleta, marca-d''água, frase e efeito) gerados pela Groq para cada Pokémon.';

create index if not exists pokemon_styles_nome_idx on public.pokemon_styles (lower(nome));
create index if not exists pokemon_styles_efeito_idx on public.pokemon_styles (efeito);

create or replace function public.touch_pokemon_styles()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists pokemon_styles_touch on public.pokemon_styles;
create trigger pokemon_styles_touch
  before update on public.pokemon_styles
  for each row execute procedure public.touch_pokemon_styles();

-- ----------------------------------------------------------------------------
-- Segurança: qualquer visitante pode LER o cache (a ficha é pública),
-- mas somente a Edge Function (service_role, que ignora RLS) pode GRAVAR.
-- ----------------------------------------------------------------------------
alter table public.pokemon_styles enable row level security;

drop policy if exists "estilos leitura publica" on public.pokemon_styles;
create policy "estilos leitura publica"
  on public.pokemon_styles for select
  to anon, authenticated
  using (true);

-- Sem policy de insert/update/delete: ninguém grava com a chave pública.

grant select on public.pokemon_styles to anon, authenticated;
