import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

export const validatePDF = async (filePath) => {
  try {
    const pdfBytes = fs.readFileSync(filePath);

    if (pdfBytes.length === 0) {
      return { valid: false, message: 'The uploaded file is empty' };
    }

    // Try to parse it — if it throws, it is not a valid PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages  = pdfDoc.getPages();

    if (pages.length === 0) {
      return { valid: false, message: 'The uploaded PDF has no pages' };
    }

    return { valid: true };
  } catch {
    return { valid: false, message: 'The uploaded file is not a valid PDF' };
  }
};