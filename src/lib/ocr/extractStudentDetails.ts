export type ExtractedStudentDetails = {
  semester_year: string;
  branch: string;
  status: string;
  date_of_exam: string;
  booklet_serial_no: string;
  candidate_roll_number: string;
};

export function extractStudentDetails(text: string): ExtractedStudentDetails {
  const semesterMatch = text.match(/semester\s*year[:\-\s]*([IVX]+)/i);

  const branchMatch = text.match(
    /branch[:\-\s]*([A-Z0-9.\-\s]+)/i,
  );

  const statusMatch = text.match(/status[:\-\s]*([A-Za-z]+)/i);

  const examDateMatch = text.match(
    /date\s*of\s*exam[:\-\s]*([0-9]{2}[\/-][0-9]{2}[\/-][0-9]{4})/i,
  );

  const bookletMatch = text.match(
    /booklet\s*serial\s*no[:\-\s]*([A-Z0-9]+)/i,
  );

  const rollMatch = text.match(
    /candidate\s*roll\s*number[:\-\s]*([A-Z0-9]+)/i,
  );

  return {
    semester_year: semesterMatch?.[1]?.trim() ?? "",
    branch: branchMatch?.[1]?.trim() ?? "",
    status: statusMatch?.[1]?.trim() ?? "",
    date_of_exam: examDateMatch?.[1]?.trim() ?? "",
    booklet_serial_no: bookletMatch?.[1]?.trim() ?? "",
    candidate_roll_number: rollMatch?.[1]?.trim() ?? "",
  };
}