/**
 * lib/source-map.ts
 * M4.1B — deterministic Markdown line/span → textarea character offsets.
 * P4 sourcePosition is body-relative (after gray-matter strip); the editor
 * holds full markdown including frontmatter. Convert explicitly.
 */

export interface SourceSpan {
  startLine: number;
  endLine?: number;
}

/**
 * Number of lines occupied by YAML frontmatter in the full document
 * (including the closing `---` line). Returns 0 when no frontmatter.
 *
 * gray-matter style: document starts with `---` … `---`.
 */
export function frontmatterBodyOffset(md: string): number {
  if (!md.startsWith("---")) return 0;
  const lines = md.split("\n");
  // lines[0] is opening ---
  for (let i = 1; i < lines.length; i++) {
    if (/^---\s*$/.test(lines[i])) {
      return i + 1; // body starts on the next line after closing ---
    }
  }
  return 0; // unclosed — treat as no frontmatter for mapping
}

/** Body-relative 0-based line → full-document 0-based line. */
export function bodyLineToEditorLine(md: string, bodyLine: number): number {
  return frontmatterBodyOffset(md) + bodyLine;
}

/** Character offset of the start of a 0-based full-document line. */
export function lineToOffset(md: string, line: number): number {
  if (line <= 0) return 0;
  const lines = md.split("\n");
  let pos = 0;
  const n = Math.min(line, lines.length);
  for (let i = 0; i < n; i++) {
    pos += lines[i].length + 1; // + newline
  }
  // If line is past last line, clamp to end of string
  if (line >= lines.length) return md.length;
  return Math.min(pos, md.length);
}

/**
 * Convert a body-relative source span into textarea selection offsets
 * on the full markdown string. Selects whole lines (P4 is line-level).
 */
export function sourceSpanToSelection(
  md: string,
  span: SourceSpan
): { start: number; end: number } | null {
  if (!Number.isInteger(span.startLine) || span.startLine < 0) return null;
  const startEditor = bodyLineToEditorLine(md, span.startLine);
  const endBody = span.endLine ?? span.startLine;
  if (!Number.isInteger(endBody) || endBody < span.startLine) return null;
  const endEditor = bodyLineToEditorLine(md, endBody);
  const lines = md.split("\n");
  if (startEditor >= lines.length) return null;
  const start = lineToOffset(md, startEditor);
  // include the full last line (up to and including its last char, not the following newline)
  const endLineClamped = Math.min(endEditor, lines.length - 1);
  const end = lineToOffset(md, endLineClamped) + lines[endLineClamped].length;
  return { start, end: Math.min(end, md.length) };
}

/** Full-document section span (already in editor lines) → selection. */
export function editorLineSpanToSelection(
  md: string,
  startLine: number,
  endLine: number
): { start: number; end: number } | null {
  return sourceSpanToSelection(md, {
    startLine: startLine - frontmatterBodyOffset(md),
    endLine: endLine - frontmatterBodyOffset(md),
  });
}
