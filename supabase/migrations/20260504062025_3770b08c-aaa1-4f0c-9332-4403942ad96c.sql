
-- =========================================================
-- ENUMS
-- =========================================================
create type public.app_role as enum ('admin','manager','faculty','student');
create type public.script_status as enum ('pending','in_progress','evaluated','submitted','rejected');

-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  college_code text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- =========================================================
-- USER ROLES
-- =========================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.current_user_has_any_role(_roles app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = any(_roles)
  )
$$;

-- =========================================================
-- HANDLE NEW USER (auto profile + default student role)
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);

  insert into public.user_roles (user_id, role)
  values (new.id, 'student');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- updated_at trigger helper
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================
-- MASTER DATA TABLES (generic shape)
-- =========================================================
create table public.regions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  region_id uuid references public.regions(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.degrees (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  degree_id uuid references public.degrees(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  branch_id uuid references public.branches(id) on delete set null,
  semester_id uuid references public.semesters(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faculty_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  code text unique not null,
  name text not null,
  email text,
  phone text,
  college_id uuid references public.colleges(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  enrollment_no text unique not null,
  name text not null,
  email text,
  college_id uuid references public.colleges(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  semester_id uuid references public.semesters(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_papers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  exam_session_id uuid references public.exam_sessions(id) on delete set null,
  total_marks numeric(6,2) not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marking_schemes (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references public.question_papers(id) on delete cascade,
  scheme jsonb not null default '{}'::jsonb,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evaluation_rules (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at triggers for masters
do $$
declare t text;
begin
  for t in select unnest(array[
    'regions','colleges','degrees','branches','semesters','subjects',
    'exam_sessions','faculty_profiles','students','question_papers',
    'marking_schemes','evaluation_rules'
  ])
  loop
    execute format('create trigger %I_set_updated before update on public.%I for each row execute function public.set_updated_at();', t, t);
  end loop;
end$$;

-- =========================================================
-- QUESTIONS
-- =========================================================
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.question_papers(id) on delete cascade,
  parent_id uuid references public.questions(id) on delete cascade,
  q_no text not null,
  text text,
  max_marks numeric(6,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index questions_paper_idx on public.questions(paper_id);

-- =========================================================
-- ANSWER SCRIPTS
-- =========================================================
create table public.answer_scripts (
  id uuid primary key default gen_random_uuid(),
  script_code text unique not null,
  student_id uuid references public.students(id) on delete set null,
  paper_id uuid references public.question_papers(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  pdf_url text,
  status script_status not null default 'pending',
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_at timestamptz,
  submitted_at timestamptz,
  rejected_reason text,
  total_awarded numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index answer_scripts_assigned_idx on public.answer_scripts(assigned_to);
create index answer_scripts_status_idx on public.answer_scripts(status);
create trigger answer_scripts_set_updated before update on public.answer_scripts
  for each row execute function public.set_updated_at();

create table public.script_scores (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.answer_scripts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  marks numeric(6,2),
  is_na boolean not null default false,
  is_nr boolean not null default false,
  remarks text,
  evaluated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (script_id, question_id)
);
create trigger script_scores_set_updated before update on public.script_scores
  for each row execute function public.set_updated_at();

create table public.script_rejections (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.answer_scripts(id) on delete cascade,
  reason text not null,
  rejected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.evaluation_audit (
  id uuid primary key default gen_random_uuid(),
  script_id uuid references public.answer_scripts(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ENABLE RLS on all
-- =========================================================
alter table public.regions enable row level security;
alter table public.colleges enable row level security;
alter table public.degrees enable row level security;
alter table public.branches enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.faculty_profiles enable row level security;
alter table public.students enable row level security;
alter table public.question_papers enable row level security;
alter table public.marking_schemes enable row level security;
alter table public.evaluation_rules enable row level security;
alter table public.questions enable row level security;
alter table public.answer_scripts enable row level security;
alter table public.script_scores enable row level security;
alter table public.script_rejections enable row level security;
alter table public.evaluation_audit enable row level security;

-- =========================================================
-- POLICIES
-- =========================================================

-- profiles: users see/update own; admins/managers see all
create policy "profiles self read" on public.profiles for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));
create policy "profiles self update" on public.profiles for update to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "profiles admin insert" on public.profiles for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or auth.uid() = id);

-- user_roles: only admins manage; users can read own roles
create policy "roles read own" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles admin all" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- helper: master read = any authenticated; master write = admin
do $$
declare t text;
begin
  for t in select unnest(array[
    'regions','colleges','degrees','branches','semesters','subjects',
    'exam_sessions','faculty_profiles','students','question_papers',
    'marking_schemes','evaluation_rules','questions'
  ])
  loop
    execute format($f$create policy "%1$s read auth" on public.%1$I for select to authenticated using (true);$f$, t);
    execute format($f$create policy "%1$s admin write" on public.%1$I for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));$f$, t);
  end loop;
end$$;

-- answer_scripts: admin/manager full; faculty only own assigned
create policy "scripts admin manager all" on public.answer_scripts for all to authenticated
  using (public.current_user_has_any_role(array['admin','manager']::app_role[]))
  with check (public.current_user_has_any_role(array['admin','manager']::app_role[]));
create policy "scripts faculty read own" on public.answer_scripts for select to authenticated
  using (assigned_to = auth.uid());
create policy "scripts faculty update own" on public.answer_scripts for update to authenticated
  using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());
create policy "scripts student read own" on public.answer_scripts for select to authenticated
  using (
    status = 'submitted'
    and exists (select 1 from public.students s where s.id = answer_scripts.student_id and s.user_id = auth.uid())
  );

-- script_scores: admin/manager full; faculty only on own scripts
create policy "scores admin manager all" on public.script_scores for all to authenticated
  using (public.current_user_has_any_role(array['admin','manager']::app_role[]))
  with check (public.current_user_has_any_role(array['admin','manager']::app_role[]));
create policy "scores faculty rw own" on public.script_scores for all to authenticated
  using (exists (select 1 from public.answer_scripts a where a.id = script_scores.script_id and a.assigned_to = auth.uid()))
  with check (exists (select 1 from public.answer_scripts a where a.id = script_scores.script_id and a.assigned_to = auth.uid()));
create policy "scores student read own submitted" on public.script_scores for select to authenticated
  using (exists (
    select 1 from public.answer_scripts a
    join public.students s on s.id = a.student_id
    where a.id = script_scores.script_id and a.status='submitted' and s.user_id = auth.uid()
  ));

-- script_rejections: faculty insert on own; admin/manager all
create policy "rej admin manager all" on public.script_rejections for all to authenticated
  using (public.current_user_has_any_role(array['admin','manager']::app_role[]))
  with check (public.current_user_has_any_role(array['admin','manager']::app_role[]));
create policy "rej faculty insert own" on public.script_rejections for insert to authenticated
  with check (exists (select 1 from public.answer_scripts a where a.id = script_rejections.script_id and a.assigned_to = auth.uid()));
create policy "rej faculty read own" on public.script_rejections for select to authenticated
  using (exists (select 1 from public.answer_scripts a where a.id = script_rejections.script_id and a.assigned_to = auth.uid()));

-- evaluation_audit: admin/manager read; insert any auth (server logs)
create policy "audit admin manager read" on public.evaluation_audit for select to authenticated
  using (public.current_user_has_any_role(array['admin','manager']::app_role[]));
create policy "audit insert auth" on public.evaluation_audit for insert to authenticated
  with check (auth.uid() = actor_id);

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
insert into storage.buckets (id, name, public) values
  ('answer-scripts','answer-scripts', false),
  ('bulk-uploads','bulk-uploads', false),
  ('avatars','avatars', true)
on conflict (id) do nothing;

-- avatars: anyone read; user can upload own
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars user upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars user update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- answer-scripts: admin/manager full; faculty read own assigned (path convention: scripts/<script_id>/...)
create policy "answer-scripts admin write" on storage.objects for all to authenticated
  using (bucket_id='answer-scripts' and public.current_user_has_any_role(array['admin','manager']::app_role[]))
  with check (bucket_id='answer-scripts' and public.current_user_has_any_role(array['admin','manager']::app_role[]));
create policy "answer-scripts faculty read" on storage.objects for select to authenticated
  using (
    bucket_id='answer-scripts'
    and exists (
      select 1 from public.answer_scripts a
      where a.assigned_to = auth.uid()
        and a.id::text = (storage.foldername(name))[1]
    )
  );

-- bulk-uploads: admin/manager only
create policy "bulk admin write" on storage.objects for all to authenticated
  using (bucket_id='bulk-uploads' and public.current_user_has_any_role(array['admin','manager']::app_role[]))
  with check (bucket_id='bulk-uploads' and public.current_user_has_any_role(array['admin','manager']::app_role[]));
