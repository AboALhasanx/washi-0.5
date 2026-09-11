/**
 * lib/outline.ts
 * Markdown section outline + safe reorder (M4.1).
 * Source of truth remains the markdown string — this only splices ## blocks.
 *
 * Provenance ownership: a run of blank lines and `<!-- source: … -->`
 * comments immediately above a `##` heading belongs to that section and
 * moves with it (M4.1A). Preamble (frontmatter, h1, intro) stays put.
 */

export interface OutlineSection {
  title: string;
  /** 0-based line index where the section block starts (may be a leading
   *  source comment / blank above the `##` heading). */
  start: number;
  /** 0-based line index of the `##` heading itself. */
  headingLine: number;
  /** 0-based last line of the section (inclusive) */
  end: number;
}

/** True if this line is provenance metadata that should ride with a section. */
function isLeadingSectionMeta(line: string): boolean {
  const t = line.trim();
  if (t === "") return true;
  return /^<!--\s*source\s*:/i.test(t);
}

/**
 * Walk upward from a `##` line over blanks + source comments.
 * Returns the first line index of that attached run (or headingLine).
 */
function leadingAttachStart(lines: string[], headingLine: number): number {
  let start = headingLine;
  for (let i = headingLine - 1; i >= 0; i--) {
    if (!isLeadingSectionMeta(lines[i])) break;
    start = i;
  }
  return start;
}

/** Split markdown into `##` sections. Preamble (frontmatter/h1/intro) is not a section. */
export function splitOutline(md: string): OutlineSection[] {
  const lines = md.split("\n");
  const idx: number[] = [];
  lines.forEach((l, i) => {
    if (/^##\s+/.test(l)) idx.push(i);
  });
  return idx.map((headingLine, k) => {
    const start = leadingAttachStart(lines, headingLine);
    return {
      title: lines[headingLine].replace(/^##\s+/, "").trim(),
      start,
      headingLine,
      end: k + 1 < idx.length ? idx[k + 1] - 1 : lines.length - 1,
    };
  });
}

/**
 * Move section `from` to index `to`. Content before the first section
 * attach-point (frontmatter/h1/intro) stays put. Leading source comments
 * move with their section.
 * Returns the new markdown string, or the original if the move is invalid.
 */
export function reorderMarkdownSections(md: string, from: number, to: number): string {
  const outline = splitOutline(md);
  if (!outline.length) return md;
  if (from === to || from < 0 || to < 0 || from >= outline.length || to >= outline.length) {
    return md;
  }
  const lines = md.split("\n");
  const starts = outline.map((o) => o.start);
  const lastEnd = lines.length - 1;
  const preamble = lines.slice(0, starts[0]);
  // Block i runs from its attach-start to the next section's attach-start
  // (exclusive). Leading meta of the next section is not swallowed here.
  const blocks = outline.map((sec, i) => {
    const nextStart = i + 1 < outline.length ? outline[i + 1].start : lastEnd + 1;
    return lines.slice(sec.start, nextStart);
  });
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  return [...preamble, ...blocks.flat()].join("\n");
}
