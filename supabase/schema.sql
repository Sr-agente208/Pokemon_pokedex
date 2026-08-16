-- Execute este arquivo inteiro em Supabase > SQL Editor > New query.
-- Nunca coloque chaves secretas neste arquivo ou no Git.
-- Depois de criar a PRIMEIRA conta pelo site, transforme apenas ela em ADM manualmente:
-- update public.profiles set cargo='ADM' where email='seu-email@exemplo.com';
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  cargo text not null default 'Usuário' check (cargo in ('Usuário','Assistente','ADM')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.verification_codes (
  code text primary key,
  cargo text not null check (cargo in ('Assistente','ADM')),
  created_by uuid references public.profiles(id),
  expires_at timestamptz not null,
  used_at timestamptz
);
create table if not exists public.recados (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  mensagem text not null check (char_length(mensagem) between 1 and 1000),
  cargo text not null default 'Usuário',
  criado_em timestamptz not null default now()
);
create table if not exists public.favoritos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  numero integer not null,
  imagem text,
  tipo text,
  unique(usuario_id, numero)
);

-- No cadastro, todo mundo começa como Usuário. ADM/Assistente exigem código válido.
create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare wanted text := coalesce(new.raw_user_meta_data->>'cargo', 'Usuário'); supplied text := new.raw_user_meta_data->>'codigo_verificacao'; granted text := 'Usuário';
begin
  if wanted in ('ADM','Assistente') and supplied is not null then
    update verification_codes set used_at=now()
      where code=supplied and cargo=wanted and used_at is null and expires_at > now()
      returning cargo into granted;
    granted := coalesce(granted, 'Usuário');
  end if;
  insert into profiles(id,nome,email,cargo) values (new.id, coalesce(new.raw_user_meta_data->>'nome','Treinador'), new.email, granted);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_profile_for_user();

create or replace function public.fill_recado_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select nome,cargo into new.nome,new.cargo from profiles where id=auth.uid() and ativo=true;
  new.user_id:=auth.uid();
  if new.nome is null then raise exception 'Conta inativa ou inválida'; end if;
  return new;
end $$;
drop trigger if exists before_recado_insert on public.recados;
create trigger before_recado_insert before insert on public.recados for each row execute procedure public.fill_recado_author();

create or replace function public.generate_verification_code(requested_cargo text)
returns table(codigo text, cargo text, expira_em text) language plpgsql security definer set search_path = public as $$
declare generated text; begin
  if (select p.cargo from profiles p where p.id=auth.uid() and p.ativo=true) <> 'ADM' then raise exception 'Apenas ADM pode gerar códigos'; end if;
  if requested_cargo not in ('ADM','Assistente') then raise exception 'Cargo inválido'; end if;
  generated := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into verification_codes(code,cargo,created_by,expires_at) values(generated,requested_cargo,auth.uid(),now()+interval '30 minutes');
  return query select generated, requested_cargo, '30 minutos';
end $$;

alter table public.profiles enable row level security;
alter table public.recados enable row level security;
alter table public.favoritos enable row level security;
alter table public.verification_codes enable row level security;
create policy "profiles public read" on public.profiles for select to authenticated using (ativo=true);
create policy "recados public read" on public.recados for select to anon, authenticated using (true);
create policy "authenticated inserts recados" on public.recados for insert to authenticated with check (auth.uid() = user_id);
create policy "owner or staff deletes recados" on public.recados for delete to authenticated using (user_id=auth.uid() or exists(select 1 from profiles where id=auth.uid() and cargo in ('ADM','Assistente') and ativo));
create policy "own favorites" on public.favoritos for all to authenticated using (usuario_id=auth.uid()) with check (usuario_id=auth.uid());
