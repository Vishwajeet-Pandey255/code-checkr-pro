import { supabase } from "@/integrations/supabase/client";

export async function uploadQuestionPaper(
  file: File,
  data: {
    title: string;
    subject_code: string;
    subject_name: string;
    exam_cycle: string;
  }
) {
  const filePath = `question-papers/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from("documents")
    .getPublicUrl(filePath);

  const pdfUrl = publicUrlData.publicUrl;

  const { error } = await supabase
    .from("question_papers")
    .insert({
      code: data.subject_code,
      name: data.title,
    });

  if (error) throw error;

  return pdfUrl;
}