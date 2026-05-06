
-- Storage RLS policies for answer-scripts bucket
DROP POLICY IF EXISTS "answer_scripts admin manager all" ON storage.objects;
CREATE POLICY "answer_scripts admin manager all"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'answer-scripts' AND public.current_user_has_any_role(ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (bucket_id = 'answer-scripts' AND public.current_user_has_any_role(ARRAY['admin'::app_role, 'manager'::app_role]));

DROP POLICY IF EXISTS "answer_scripts faculty read assigned" ON storage.objects;
CREATE POLICY "answer_scripts faculty read assigned"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'answer-scripts' AND EXISTS (
      SELECT 1 FROM public.answer_scripts a
      WHERE a.pdf_url = storage.objects.name AND a.assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS "answer_scripts student read own" ON storage.objects;
CREATE POLICY "answer_scripts student read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'answer-scripts' AND EXISTS (
      SELECT 1 FROM public.answer_scripts a
      JOIN public.students s ON s.id = a.student_id
      WHERE a.pdf_url = storage.objects.name
        AND a.status = 'submitted'::script_status
        AND s.user_id = auth.uid()
    )
  );
