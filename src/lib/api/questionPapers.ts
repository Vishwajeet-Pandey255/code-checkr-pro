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
      title: data.title,
      subject_code: data.subject_code,
      subject_name: data.subject_name,
      exam_cycle: data.exam_cycle,
      pdf_url: pdfUrl,
    });

  if (error) throw error;

  return pdfUrl;
}