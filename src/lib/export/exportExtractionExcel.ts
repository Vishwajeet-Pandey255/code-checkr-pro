import * as XLSX from "xlsx";

export function exportExtractionExcel(rows: unknown[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Student OCR Data",
  );

  XLSX.writeFile(workbook, "student_ocr_records.xlsx");
}