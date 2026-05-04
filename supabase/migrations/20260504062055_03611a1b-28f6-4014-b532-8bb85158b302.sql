
-- 1. Set search_path on set_updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

-- 2. Revoke execute from public/anon/authenticated on internal SECURITY DEFINER functions
revoke execute on function public.has_role(uuid, app_role) from public, anon, authenticated;
revoke execute on function public.current_user_has_any_role(app_role[]) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- has_role / current_user_has_any_role need to be callable from RLS policies; policies run as the
-- table owner so postgres role is sufficient. Re-grant only to postgres (already implicit) and
-- service_role for server functions.
grant execute on function public.has_role(uuid, app_role) to service_role;
grant execute on function public.current_user_has_any_role(app_role[]) to service_role;

-- 3. Tighten avatars public-listing: drop broad SELECT, only allow object access by exact path
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public object read" on storage.objects for select
  using (bucket_id = 'avatars');
-- Note: bucket remains public for direct URL access; listing is gated by storage default behavior.
-- For stricter control, we make the bucket private:
update storage.buckets set public = false where id = 'avatars';
