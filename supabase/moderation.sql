-- Execute no Supabase SQL Editor para registrar as decisões do Treinador Nébula.
create table if not exists public.moderation_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  mensagem text not null,
  status text not null check (status in ('APPROVED','BLOCKED','REVIEW')),
  reason text,
  confidence numeric,
  created_at timestamptz not null default now()
);
alter table public.moderation_events enable row level security;
-- A Edge Function grava o histórico com segurança. Usuários não recebem acesso direto à tabela.
