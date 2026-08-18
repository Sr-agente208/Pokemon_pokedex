-- Execute no Supabase SQL Editor para permitir que ADM/Assistente excluam recados.
create or replace function public.delete_recado_as_staff(target_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and ativo = true
      and cargo in ('ADM', 'Assistente')
  ) then
    raise exception 'Sem permissão para excluir recados.';
  end if;

  delete from public.recados where id = target_id;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

grant execute on function public.delete_recado_as_staff(bigint) to authenticated;
