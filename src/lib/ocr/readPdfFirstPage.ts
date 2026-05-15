import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";

// ✅ Proper Vite worker import
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ✅ Debug logger
function logOCRStep(step: string, data?: any) {
  console.log(`[OCR] ${step}`, data ?? "");
}

export async function readPdfFirstPage(
  file: File
): Promise<string> {
  try {
    logOCRStep("Starting OCR for file", file.name);

    // =========================
    // READ PDF BUFFER
    // =========================
    const buffer = await file.arrayBuffer();

    // =========================
    // LOAD PDF
    // =========================
    const pdf = await pdfjsLib.getDocument({
      data: buffer,
    }).promise;

    logOCRStep("PDF loaded");

    // =========================
    // GET FIRST PAGE
    // =========================
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({
      scale: 2,
    });

    // =========================
    // CREATE CANVAS
    // =========================
    const canvas = document.createElement("canvas");

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas not supported");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // =========================
    // RENDER PDF PAGE
    // =========================
    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    logOCRStep("Page rendered to canvas");

    // =========================
    // CONVERT TO IMAGE
    // =========================
    const image = canvas.toDataURL("image/png");

    logOCRStep("Sending image to Tesseract");

    // =========================
    // OCR PROCESS
    // =========================
    const result = await Tesseract.recognize(
      image,
      "eng",
      {
        logger: (m) => {
          console.log("[Tesseract]", m);
        },
      }
    );

    // =========================
    // FINAL EXTRACTED TEXT
    // =========================
    const text =
      result.data.text?.trim() || "";

    logOCRStep(
      "OCR COMPLETE",
      text.substring(0, 200)
    );

    return text;
  } catch (error) {
    console.error("❌ OCR FAILED:", error);

    return "";
  }
}