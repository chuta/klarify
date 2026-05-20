// =============================================================================
// PDF text extraction for the RAG ingest pipeline.
//
// Wraps the `pdf-parse` v2 PDFParse class with two guard rails:
//   1. Reads the PDF into a Uint8Array ONCE (PDFParse's worker-based pipeline
//      takes ownership of TypedArrays, so we must not reuse the buffer after
//      load).
//   2. Normalises whitespace conservatively. We must preserve paragraph breaks
//      and headings — they drive the chunker's section detection in chunker.ts.
//
// Returns the raw text plus minimal stats (page count, char count) so the
// ingest CLI can report progress per file.
// =============================================================================
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

export interface ExtractedPdf {
  /** Cleaned full-document text, ready to feed into chunkText(). */
  text: string;
  /** PDF page count — used for sanity checks during ingest. */
  pages: number;
  /** Raw character count, useful for cost estimation. */
  charCount: number;
}

/**
 * Extract text from a PDF file on disk.
 *
 * @param filePath absolute path to the PDF
 * @throws if the file is unreadable, not a PDF, or yields zero text
 */
export async function extractPdf(filePath: string): Promise<ExtractedPdf> {
  const buffer = await readFile(filePath);
  // pdf-parse v2 takes ownership of the TypedArray. Slice into a fresh
  // Uint8Array so consumers that share a Buffer pool aren't affected.
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).slice();
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();

    const text = normaliseExtractedText(result.text);
    if (text.length === 0) {
      throw new Error(
        `extractPdf: ${filePath} produced zero text. ` +
          `Likely a scanned image-only PDF — Sprint 3 OCR pipeline can rescue it.`,
      );
    }

    return {
      text,
      pages: result.total,
      charCount: text.length,
    };
  } finally {
    await parser.destroy();
  }
}

/**
 * Conservative whitespace normalisation that preserves the structural cues the
 * chunker relies on (blank lines between paragraphs, heading-like single lines
 * in ALL CAPS or "SECTION N." form).
 *
 * Exported for unit testing.
 */
export function normaliseExtractedText(raw: string): string {
  return raw
    // pdf-parse occasionally emits a NUL byte at PDF object boundaries.
    .replace(/\u0000/g, '')
    // Soft hyphen artefacts on line wraps (common in PDFs that justify text).
    .replace(/\u00AD/g, '')
    // Collapse non-breaking spaces to regular spaces.
    .replace(/\u00A0/g, ' ')
    // Normalise CR/LF and lone CRs to LF.
    .replace(/\r\n?/g, '\n')
    // Strip trailing whitespace on each line (keeps blank-line detection clean).
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    // Collapse runs of 3+ blank lines down to 2 (preserves paragraph breaks).
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
