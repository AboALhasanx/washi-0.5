/**
 * lib/outline.ts
 * Markdown section outline + safe reorder (M4.1).
 * Source of truth remains the markdown string — this only splices ## blocks.
 */

export interface OutlineSection {
  title: string;
  /** 0-based line index of the `##` heading */
  start: number;
  /** 0-based last line of the section (inclusive) */
  end: number;
}

/** Split markdown into `##` sections. Preamble (frontmatter/h1) is not a section. */
export function splitOutline(md: string): OutlineSection[] {
  const lines = md.split("\n");
  const idx: number[] = [];
  lines.forEach((l, i) => {
    if (/^##\s+/.test(l)) idx.push(i);
  });
  return idx.map((start, k) => ({
    title: lines[start].replace(/^##\s+/, "").trim(),
    start,
    end: k + 1 < idx.length ? idx[k + 1] - 1 : lines.length - 1,
  }));
}

/**
 * Move section `from` to index `to`. Content before the first `##` stays put.
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
  const blocks = outline.map((sec, i) =>
    lines.slice(sec.start, i + 1 < outline.length ? outline[i + 1].start : lastEnd + 1)
  );
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  return [...preamble, ...blocks.flat()].join("\n");
}
