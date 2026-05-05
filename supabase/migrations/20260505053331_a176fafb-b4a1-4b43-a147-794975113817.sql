ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'A';
CREATE INDEX IF NOT EXISTS idx_answer_scripts_assigned_to ON public.answer_scripts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_answer_scripts_status ON public.answer_scripts(status);
CREATE INDEX IF NOT EXISTS idx_script_scores_script_id ON public.script_scores(script_id);
CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON public.questions(paper_id);