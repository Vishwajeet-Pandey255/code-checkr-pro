ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS question_paper_url text,
  ADD COLUMN IF NOT EXISTS marking_scheme_url text,
  ADD COLUMN IF NOT EXISTS marking_scheme jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS question_paper_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS marking_scheme_uploaded_at timestamptz;