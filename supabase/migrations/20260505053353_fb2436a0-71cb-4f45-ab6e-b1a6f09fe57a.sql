CREATE OR REPLACE FUNCTION public.current_user_has_any_role(_roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  select exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = any(_roles));
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  select exists (select 1 from user_roles ur where ur.user_id = _user_id and ur.role = _role);
$$;