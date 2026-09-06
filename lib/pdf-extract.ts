/// <reference types="node" />
/**
 * lib/pdf-extract.ts
 * Extracts raw text from PDF buffers with page-range support.
 * Tries pdf-parse first, falls back to pdfjs-dist.
 * Normalizes whitespace, removes hyphenation "-\n", preserves $$ LaTeX blocks.
 */
import { Buffer } from "node:buffer";

export interface ExtractOptions {
  firstPage?: number;
  lastPage?: number;
}

export interface ExtractResult {
  text: string;
  numPages: number;
}

/**
 * Normalize extracted text:
 * - Preserve $$ ... $$ LaTeX blocks (do not alter inside)
 * - Remove hyphenation at line breaks: "word-\nword" -> "wordword"
 * - Normalize whitespace (collapse spaces, normalize newlines)
 */
function normalizeText(raw: string): string {
  if (!raw) return "";

  // Preserve $$ blocks with placeholders
  const placeholders: string[] = [];
  const placeholderPrefix = "__LATEX_BLOCK_";
  let text = raw.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    const idx = placeholders.length;
    placeholders.push(match);
    return `${placeholderPrefix}${idx}__`;
  });

  // Remove hyphenation: hyphen followed by line break (with optional whitespace)
  // Handles "-\n", "-\r\n", "- \n", etc.
  text = text.replace(/-\s*\r?\n\s*/g, "");

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n");

  // Collapse horizontal whitespace per line, trim lines, keep line breaks
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    // keep empty lines as paragraph separators but remove single empty noise? We'll keep them
    .join("\n");

  // Collapse 3+ consecutive newlines to 2 (preserve paragraph breaks)
  text = text.replace(/\n{3,}/g, "\n\n");

  // Trim start/end
  text = text.trim();

  // Restore $$ blocks
  placeholders.forEach((block, i) => {
    text = text.split(`${placeholderPrefix}${i}__`).join(block);
  });

  return text;
}

async function extractWithPdfParse(
  buffer: Buffer,
  opts?: ExtractOptions
): Promise<ExtractResult | null> {
  try {
    // pdf-parse is CJS; dynamic import handles both ESM/CJS interop
    // @ts-ignore — pdf-parse has no types
    const mod: unknown = await import("pdf-parse");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = (mod as any).default ?? (mod as any);
    if (typeof pdfParse !== "function") return null;

    // If page range requested, pdf-parse cannot accurately slice per-page,
    // so signal fallback to pdfjs-dist
    if (opts?.firstPage !== undefined || opts?.lastPage !== undefined) {
      return null;
    }

    const data = await pdfParse(buffer);
    const numPages: number = data.numpages ?? data.numPages ?? 0;
    const rawText: string = data.text ?? "";
    const text = normalizeText(rawText);
    return { text, numPages };
  } catch {
    return null;
  }
}

async function extractWithPdfJs(
  buffer: Buffer,
  opts?: ExtractOptions
): Promise<ExtractResult> {
  // Dynamic import to avoid bundling issues with Next.js serverComponentsExternalPackages
  let pdfjs: unknown;
  try {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    pdfjs = await import("pdfjs-dist");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lib = pdfjs as any;
  const getDocument = lib.getDocument ?? lib.default?.getDocument;
  if (!getDocument) {
    throw new Error("pdfjs-dist getDocument not found");
  }

  const uint8 = new Uint8Array(buffer);
  const loadingTask = getDocument({
    data: uint8,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const numPages: number = pdf.numPages as number;

  let firstPage = opts?.firstPage ?? 1;
  let lastPage = opts?.lastPage ?? numPages;

  // Clamp and validate
  firstPage = Math.max(1, Math.min(firstPage, numPages));
  lastPage = Math.max(1, Math.min(lastPage, numPages));
  if (firstPage > lastPage) {
    throw new Error(
      `Invalid page range: firstPage (${firstPage}) > lastPage (${lastPage})`
    );
  }

  const pageTexts: string[] = [];
  for (let i = firstPage; i <= lastPage; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // content.items is Array<{str: string, ...}>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strings = (content.items as any[]).map((item) => {
      if (typeof item.str === "string") return item.str as string;
      return "";
    });
    // Join with space; pdfjs splits tokens, we reconstruct with heuristic
    // Use " " between tokens, then normalize later
    const pageText = strings.join(" ");
    pageTexts.push(pageText);
  }

  // Join pages with double newline to preserve page boundaries
  const rawJoined = pageTexts.join("\n\n");
  const text = normalizeText(rawJoined);
  return { text, numPages };
}

/**
 * Extract text from a PDF buffer.
 * Tries pdf-parse first (fast), falls back to pdfjs-dist for page-range accuracy and robustness.
 * @param buffer PDF file contents
 * @param options Optional page range (1-indexed, inclusive). If omitted, extracts all pages.
 */
export async function extractPdfText(
  buffer: Buffer,
  options?: ExtractOptions
): Promise<ExtractResult> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid PDF buffer: empty or not a Buffer");
  }

  // Validate options early
  if (options?.firstPage !== undefined) {
    if (!Number.isInteger(options.firstPage) || options.firstPage < 1) {
      throw new Error("firstPage must be a positive integer (1-indexed)");
    }
  }
  if (options?.lastPage !== undefined) {
    if (!Number.isInteger(options.lastPage) || options.lastPage < 1) {
      throw new Error("lastPage must be a positive integer (1-indexed)");
    }
  }
  if (
    options?.firstPage !== undefined &&
    options?.lastPage !== undefined &&
    options.firstPage > options.lastPage
  ) {
    throw new Error(
      `Invalid page range: firstPage (${options.firstPage}) > lastPage (${options.lastPage})`
    );
  }

  // Try pdf-parse first (when no page slicing needed, it's faster and handles many PDFs)
  const parsed = await extractWithPdfParse(buffer, options);
  if (parsed) {
    return parsed;
  }

  // Fallback to pdfjs-dist (handles page slicing and more robust parsing)
  return extractWithPdfJs(buffer, options);
}

export default extractPdfText;
