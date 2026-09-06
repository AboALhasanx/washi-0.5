/**
 * lib/markdown-parser.ts
 * Deterministic remark AST -> ChapterAST mapper per:
 * - specs/markdown-schema-spec.md
 * - prompts/02-markdown-to-pdfcn-mapper.md
 * - specs/pdfcn-components-catalog.md (corrected)
 * - specs/pagination-rules.md
 *
 * Stack: gray-matter + unified + remark-parse + remark-gfm + remark-math
 * Validates output via Zod schemas from lib/schemas.ts
 */

import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Root, Content, PhrasingContent } from "mdast";
import {
  chapterASTSchema,
  frontmatterSchema,
  type ChapterAST,
  type AstNode,
  type ChapterSection,
  type ProvenanceRef,
} from "./schemas";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractText(nodes: PhrasingContent[] | Content[]): string {
  let out = "";
  for (const n of nodes as any[]) {
    if (!n) continue;
    if (n.type === "text") out += n.value;
    else if (n.type === "inlineMath" || n.type === "math") out += n.value;
    else if (n.type === "strong" || n.type === "emphasis" || n.type === "paragraph" || n.type === "heading" || n.type === "blockquote" || n.type === "listItem") {
      if (Array.isArray(n.children)) out += extractText(n.children);
      if (n.type === "paragraph") out += "\n";
    } else if (n.type === "inlineCode") out += n.value;
    else if (n.type === "link" && Array.isArray(n.children)) out += extractText(n.children);
    else if (n.type === "image") out += n.alt ?? "";
    else if (Array.isArray(n.children)) out += extractText(n.children);
  }
  return out;
}

function mdastText(node: any): string {
  if (!node) return "";
  if (typeof node.value === "string" && !node.children) return node.value;
  if (Array.isArray(node.children)) return extractText(node.children);
  return "";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function detectSectionName(heading: string): ChapterSection["name"] {
  const h = heading.toLowerCase().trim();
  if (h.includes("نظرة عامة") || h.includes("overview") || h.includes("abstract") || h.includes("ملخص") && h.length < 30) {
    // ملخص as overview vs summary disambiguation: treat short heading as overview, longer summary section later
    // but spec: 1. overview, summary is last— check exact
  }
  // Deterministic mapping — order matters
  if (/(نظرة عامة|overview|abstract)/i.test(h)) return "overview";
  if (/(المفاهيم الأساسية|core concepts|مفاهيم)/i.test(h)) return "core-concepts";
  if (/(التعاريف|definitions|glossary)/i.test(h)) return "definitions";
  if (/(المعادلات|formulas|equations)/i.test(h)) return "formulas";
  if (/(أمثلة محلولة|worked examples|أمثلة|examples)/i.test(h) && !/review/i.test(h)) return "worked-examples";
  if (/(نقاط مهمة|key points|important|ملاحظات مهمة)/i.test(h)) return "key-points";
  if (/(أسئلة مراجعة|review|questions)/i.test(h)) return "review";
  // Summary heading "ملخص" as separate — spec maps list under ## ملخص / Summary -> Summary
  if (/(^ملخص$|^summary$)/i.test(h.trim())) return "overview"; // treat summary intro as overview fallback; actual summary content is list node inside
  return "custom";
}

function parseSourceComment(html: string): { raw: string; document?: string; pages?: number[]; kind?: "source-derived" | "generated" } {
  // <!-- source: Computer Networks.pdf p.142 -->
  // <!-- source: Textbook.pdf p.142-143 -->
  // <!-- source: (generated) -->  — AI-authored explanatory content, no source page
  const raw = html.trim();
  // Strip <!-- and -->
  const inner = raw.replace(/^<!--\s*/, "").replace(/\s*-->$/, "").trim();
  // Expect "source: ..." or "source ..."
  const m = inner.match(/source\s*:?\s*(.+)/i);
  if (!m) return { raw, document: undefined, pages: undefined };
  let rest = m[1].trim();
  // Explicit provenance kind marker, e.g. "(generated)" — see prompt contract
  let kind: "source-derived" | "generated" | undefined;
  const genMatch = rest.match(/\(generated\)\s*$/i);
  if (genMatch) {
    kind = "generated";
    rest = rest.replace(/\(generated\)\s*$/i, "").trim();
  }
  // Try to extract pages: p.142, p142, pp 142-143, [142,143]
  let document: string | undefined;
  let pages: number[] | undefined;

  // document is before p./pages token
  const docMatch = rest.match(/^(.+?)\s+p\.?\s*([\d,\s\-\[\]]+)/i);
  if (docMatch) {
    document = docMatch[1].trim().replace(/,$/, "");
    const pagesPart = docMatch[2];
    pages = parsePages(pagesPart);
  } else {
    // fallback: try "Document.pdf [142,143]"
    const alt = rest.match(/^(.+?)\s*\[([\d,\s,]+)\]/);
    if (alt) {
      document = alt[1].trim();
      pages = parsePages(alt[2]);
    } else {
      document = rest;
    }
  }
  if (document) document = document.replace(/^["']|["']$/g, "");
  if (!document) return { raw, kind };
  return { raw, document, pages, kind: kind ?? "source-derived" };
}

function parsePages(s: string): number[] | undefined {
  const nums = s.match(/\d+/g);
  if (!nums) return undefined;
  const out: number[] = [];
  for (const n of nums) {
    const v = parseInt(n, 10);
    if (!Number.isNaN(v) && v > 0) out.push(v);
  }
  // handle range like 142-143 => expand? spec shows pages: [142,143]
  // If dash with two numbers, expand inclusive if small range
  if (out.length === 2 && s.includes("-")) {
    const [a, b] = out;
    if (b > a && b - a < 20) {
      const expanded: number[] = [];
      for (let i = a; i <= b; i++) expanded.push(i);
      return expanded;
    }
  }
  return out.length ? out : undefined;
}

function isPaginationSafeType(type: AstNode["type"]): boolean {
  return ["definition", "callout", "formula", "figure", "code"].includes(type);
}

// Extract blockquote variant and content
function parseBlockquote(node: any): AstNode | null {
  // node.children are typically paragraph(s)
  const rawText = mdastText(node).trim();
  // Detect [!TYPE]
  const variantMatch = rawText.match(/^\s*\[!(NOTE|IMPORTANT|WARNING|EXAMPLE)\]/i);
  if (!variantMatch) {
    // Plain blockquote fallback -> callout note
    const content = rawText || extractText(node.children ?? []);
    if (!content.trim()) return null;
    return {
      type: "callout",
      variant: "NOTE",
      content: content.replace(/^\s*>\s*/gm, "").trim(),
    } as AstNode;
  }
  const variant = variantMatch[1].toUpperCase() as "NOTE" | "IMPORTANT" | "WARNING" | "EXAMPLE";
  // Remove the marker line from content
  let content = rawText.replace(/^\s*\[!(NOTE|IMPORTANT|WARNING|EXAMPLE)\]\s*/i, "").trim();
  // Also handle case where marker on its own paragraph and content next
  // If rawText starts with marker and content is empty, try next children
  if (!content) {
    // Try to get text after first paragraph
    const children = node.children ?? [];
    if (children.length > 1) {
      content = extractText(children.slice(1)).trim();
    }
  }

  // Definition detection: [!NOTE] with **Term:** pattern
  if (variant === "NOTE") {
    // Look for **Term:** — mdast strong node with colon
    // Search in original children for strong + text colon
    const term = extractDefinitionTerm(node, content);
    if (term) {
      return {
        type: "definition",
        term: term.term,
        definition: term.definition,
        variant: "NOTE",
      } as AstNode;
    }
  }

  // WorkedExample vs Callout: [!EXAMPLE] -> callout variant EXAMPLE per schema (callout covers WorkedExample)
  // Spec says > [!EXAMPLE] -> WorkedExample {title, steps} or Callout type example if simple — we map to callout EXAMPLE
  return {
    type: "callout",
    variant,
    content: content || "—",
  } as AstNode;
}

function extractDefinitionTerm(blockquoteNode: any, fallbackContent: string): { term: string; definition: string } | null {
  // Try to find **Term:** inside first paragraph's children
  const firstPara = (blockquoteNode.children ?? [])[0];
  if (!firstPara || !Array.isArray(firstPara.children)) {
    // fallback regex on fallbackContent
    const m = fallbackContent.match(/^\s*\*\*(.+?):\*\*\s*([\s\S]+)/);
    if (m) return { term: m[1].trim(), definition: m[2].trim() };
    return null;
  }
  const kids: any[] = firstPara.children;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (c.type === "strong" && Array.isArray(c.children)) {
      const strongText = extractText(c.children).trim();
      // Check colon either inside strong or after
      let term = strongText;
      let hasColon = term.endsWith(":");
      if (hasColon) term = term.slice(0, -1).trim();
      // Check next sibling text for colon
      const next = kids[i + 1];
      if (!hasColon && next && next.type === "text" && next.value.trim().startsWith(":")) {
        hasColon = true;
        // consume colon
      }
      if (hasColon || term.length > 0) {
        // Build definition as remaining content after **Term:**
        // Collect everything after this strong (and optional colon) in blockquote
        let defParts: string[] = [];
        // remainder of firstPara after strong
        for (let j = i + 1; j < kids.length; j++) {
          const r = kids[j];
          if (r.type === "text") {
            let v = r.value;
            if (j === i + 1 && hasColon && v.trim().startsWith(":")) v = v.replace(/^\s*:\s*/, "");
            defParts.push(v);
          } else if (r.type === "strong" || r.type === "emphasis") {
            defParts.push(extractText([r]));
          } else if (r.type === "inlineCode") defParts.push(r.value);
          else if (Array.isArray(r.children)) defParts.push(extractText(r.children));
        }
        // Also add following paragraphs inside blockquote
        const remainingParas = (blockquoteNode.children ?? []).slice(1);
        for (const p of remainingParas) {
          defParts.push(extractText(p.children ?? []));
        }
        const definition = defParts.join("").trim() || fallbackContent.replace(/^\*\*.+?\*\*:?\s*/, "").trim();
        if (term && definition) return { term: term.trim(), definition: definition.trim() };
        // fallback: if term found but no definition yet, try regex on fallbackContent
        const m2 = fallbackContent.match(/\*\*(.+?):\*\*\s*([\s\S]+)/);
        if (m2) return { term: m2[1].trim(), definition: m2[2].trim() };
      }
    }
  }
  // regex fallback on raw text
  const m = fallbackContent.match(/^\s*\*\*(.+?):\*\*\s*([\s\S]+)/);
  if (m) return { term: m[1].trim(), definition: m[2].trim() };
  // also support "- **Term:** def" style inside blockquote? treat similarly
  const m3 = fallbackContent.match(/^\s*[-•]\s*\*\*(.+?):\*\*\s*([\s\S]+)/);
  if (m3) return { term: m3[1].trim(), definition: m3[2].trim() };
  return null;
}

function figureCaptionFromParagraph(imageAlt: string, followingText?: string): string {
  // Caption pulled from alt or italic caption line: "*شكل: مخطط المصافحة — مصدر: p.142*"
  // Prefer alt, fallback to following italic text
  if (followingText && followingText.trim().length > 0 && followingText.includes("شكل")) {
    return followingText.replace(/^\*\s*|\s*\*$/g, "").trim();
  }
  // Also check if alt itself contains caption logic
  return imageAlt?.trim() || "Figure";
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export interface ParseResult {
  frontmatter: ChapterAST["frontmatter"];
  ast: ChapterAST;
}

export function parseMarkdown(md: string): ParseResult {
  // 1. Frontmatter via gray-matter
  const parsed = matter(md);
  const rawFrontmatter = parsed.data;
  const body = parsed.content;

  // Validate frontmatter — throw Zod error if invalid
  const frontmatter = frontmatterSchema.parse(rawFrontmatter);

  // 2. Parse markdown body to mdast
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(body) as Root;

  const nodes: AstNode[] = [];
  const sections: ChapterSection[] = [];

  // Track pending source comment — attaches to next meaningful node or current section
  let pendingSource: string | undefined;
  let pendingSourceParsed: ReturnType<typeof parseSourceComment> | undefined;
  // Washi 0.5: accumulated provenance refs (multiple <!-- source --> per block)
  let pendingProv: ProvenanceRef[] = [];

  const clearPending = () => {
    pendingSource = undefined; pendingProv = [];
    pendingSourceParsed = undefined;
    pendingProv = [];
  };

  const attachProvenance = (node: any) => {
    if (pendingProv.length && !node.provenance) {
      node.provenance = pendingProv.map((p) => ({ ...p }));
    }
  };

  // Current section in construction
  let currentSection: ChapterSection | null = null;
  let currentSectionSource: string | undefined;

  const flushSection = () => {
    if (currentSection && currentSection.nodes.length > 0) {
      if (currentSectionSource && !currentSection.source) currentSection.source = currentSectionSource;
      attachProvenance(currentSection as any);
      // A section holding only source comments is a parser artifact (a
      // <!-- source --> before the first h2) — the real section that follows
      // picks up the same source. Don't emit a contentless "Untitled" section.
      const hasContent = currentSection.nodes.some((n) => n.type !== "source");
      if (hasContent) sections.push(currentSection);
    }
    currentSection = null;
    currentSectionSource = undefined;
  };

  const ensureSection = (headingText?: string) => {
    if (!currentSection) {
      const name = headingText ? detectSectionName(headingText) : "custom";
      const title = headingText ?? "Untitled";
      currentSection = {
        name: name as ChapterSection["name"],
        heading: title,
        nodes: [],
        source: pendingSource,
      };
      if (pendingSource) {
        pendingSource = undefined; pendingProv = [];
        pendingSourceParsed = undefined;
      }
    }
  };

  const pushNode = (node: AstNode) => {
    // Attach pending source if node doesn't have one
    attachProvenance(node);
    if (pendingSource && !(node as any).source) {
      (node as any).source = pendingSource;
      pendingSource = undefined; pendingProv = [];
      pendingSourceParsed = undefined;
    }
    // Add paginationSafe flag (non-validated, for renderer)
    // Preserve for renderer but don't break Zod — we add after validation via enrichment
    // For now attach as extra property that will be stripped then re-added post-validation
    (node as any).paginationSafe = isPaginationSafeType(node.type);
    // Also set breakInside avoid flag for renderer convenience
    (node as any).breakInside = isPaginationSafeType(node.type) ? "avoid" : undefined;

    nodes.push(node);
    ensureSection();
    currentSection!.nodes.push(node);
  };

  const handleHtmlSource = (value: string) => {
    // Detect <!-- source: ... -->
    if (/<!--\s*source\s*:/i.test(value)) {
      const parsedSrc = parseSourceComment(value);
      pendingSource = parsedSrc.raw.replace(/^<!--\s*|\s*-->$/g, "").trim(); // "source: Textbook.pdf p.142"
      pendingSourceParsed = parsedSrc;
      // Also create a source node for AST flat list (traceability)
      const srcNode: AstNode = {
        type: "source",
        raw: value.trim(),
        document: parsedSrc.document,
        pages: parsedSrc.pages,
      } as AstNode;
      // Washi 0.5 provenance: accumulate ref for the next content node
      if (parsedSrc.document) {
        pendingProv.push({
          document: parsedSrc.document,
          ...(parsedSrc.pages ? { pages: parsedSrc.pages } : {}),
          ...(parsedSrc.kind ? { kind: parsedSrc.kind } : {}),
        });
      }
      // Don't double attach pendingSource to this node
      nodes.push(srcNode);
      // Attach to current section nodes as well for traceability but not as section.nodes? include.
      ensureSection();
      currentSection!.nodes.push(srcNode);
      // Keep pendingSource for next content node as well? spec says per-section source comment
      // We keep pendingSource for next node too (duplicate for section)
      // But we already consumed for section creation; keep for next pushNode will use duplicate
      // Actually set pendingSource again for next node (still)
      pendingSource = parsedSrc.raw.replace(/^<!--\s*|\s*-->$/g, "").trim();
      // Track section source
      if (currentSection && !currentSection.source) {
        currentSection.source = pendingSource;
        currentSectionSource = pendingSource;
      }
      return true;
    }
    return false;
  };

  // Walk top-level children
  for (let idx = 0; idx < tree.children.length; idx++) {
    const child: any = tree.children[idx];

    switch (child.type) {
      case "heading": {
        const text = mdastText(child).trim();
        if (!text) break;
        const level = child.depth as 1 | 2 | 3;
        // h1 -> ChapterTitle, h2 -> Section, h3 -> Subsection
        if (level === 1) {
          // ChapterTitle: also heading node L1 — emit as heading node, not section
          const h1Node: AstNode = {
            type: "heading",
            level: 1,
            text,
            source: pendingSource,
          } as AstNode;
          attachProvenance(h1Node);
          if (pendingSource) {
            pendingSource = undefined; pendingProv = [];
            pendingSourceParsed = undefined;
          }
          nodes.push(h1Node);
          // h1 does not start a section; it is chapter title outside sections
          // But ensure sections will be created after
          // Add paginationSafe false for heading
          (h1Node as any).paginationSafe = false;
          break;
        }
        if (level === 2) {
          // flush previous section
          flushSection();
          const name = detectSectionName(text);
          currentSection = {
            name: name as ChapterSection["name"],
            heading: text,
            nodes: [],
            source: pendingSource,
          };
          if (pendingSource) {
            currentSectionSource = pendingSource;
          }
          attachProvenance(currentSection as any);
          if (pendingSource) {
            pendingSource = undefined; pendingProv = [];
            pendingSourceParsed = undefined;
          }
          // Also emit heading node inside section (for pdf renderer)
          const h2Node: AstNode = {
            type: "heading",
            level: 2,
            text,
            source: currentSection.source,
          } as AstNode;
          (h2Node as any).paginationSafe = false;
          attachProvenance(h2Node);
          // h2 heading is section title — add to both flat nodes and section nodes
          nodes.push(h2Node);
          currentSection.nodes.push(h2Node);
          break;
        }
        if (level === 3) {
          const h3Node: AstNode = {
            type: "heading",
            level: 3,
            text,
            source: pendingSource,
          } as AstNode;
          attachProvenance(h3Node);
          if (pendingSource) {
            pendingSource = undefined; pendingProv = [];
            pendingSourceParsed = undefined;
          }
          (h3Node as any).paginationSafe = false;
          pushNode(h3Node);
          break;
        }
        // fallback depth >3 treat as h3
        break;
      }

      case "paragraph": {
        // Check if paragraph contains only image(s) -> Figure
        const imageChildren = (child.children ?? []).filter((c: any) => c.type === "image");
        const textOnly = (child.children ?? []).filter((c: any) => c.type !== "image");
        const hasImage = imageChildren.length > 0;

        if (hasImage) {
          // For each image, create Figure node
          for (const img of imageChildren) {
            const alt = (img.alt ?? "").trim();
            const src = (img.url ?? "").trim();
            // Look ahead for caption: next sibling may be paragraph with italic *caption*
            let caption = alt || "Figure";
            let sourceForFigure = pendingSource;
            // Peek next node if it's paragraph starting with *...
            const next = tree.children[idx + 1] as any;
            let consumedNext = false;
            if (next && next.type === "paragraph") {
              const nxtText = mdastText(next).trim();
              if (/^\*[\s\S]*\*$/.test(nxtText) || /^شكل:/.test(nxtText) || /^Figure:/i.test(nxtText) || /مصدر:/.test(nxtText)) {
                caption = nxtText.replace(/^\*+|\*+$/g, "").trim();
                consumedNext = true;
                // consume it
                idx++; // skip next paragraph (caption)
              } else if (!alt && nxtText.length > 0 && nxtText.length < 200) {
                caption = nxtText;
              }
            }
            // If alt contains "Figure:" prefix keep
            const figNode: AstNode = {
              type: "figure",
              src: src || "figures/placeholder.png",
              alt: alt || caption.slice(0, 80) || "Figure",
              caption,
              source: sourceForFigure,
            } as AstNode;
            pushNode(figNode);
          }
          // If there was text alongside image (rare), also emit paragraph for remaining text
          const remainingText = textOnly
            .map((c: any) => (c.type === "text" ? c.value : extractText([c])))
            .join("")
            .trim();
          if (remainingText) {
            const pNode: AstNode = {
              type: "paragraph",
              text: remainingText,
              source: undefined,
            } as AstNode;
            pushNode(pNode);
          }
          break;
        }

        // Check for inline image already handled above; else handle inlineMath
        const inlineMathChildren = (child.children ?? []).filter((c: any) => c.type === "inlineMath");
        if (inlineMathChildren.length > 0) {
          // Emit paragraph text without math, plus formula nodes for each inline math
          // Build paragraph text excluding inlineMath
          let paraText = "";
          for (const c of child.children) {
            if (c.type === "text") paraText += c.value;
            else if (c.type === "strong" || c.type === "emphasis") paraText += extractText(c.children);
            else if (c.type === "inlineCode") paraText += c.value;
            else if (c.type === "inlineMath") paraText += ""; // skip
            else if (c.type === "link") paraText += extractText(c.children);
          }
          paraText = paraText.trim();
          if (paraText) {
            const pNode: AstNode = {
              type: "paragraph",
              text: paraText,
              source: pendingSource,
            } as AstNode;
            pushNode(pNode);
          }
          // Emit each inlineMath as formula (displayMode false)
          for (const im of inlineMathChildren) {
            const fNode: AstNode = {
              type: "formula",
              latex: (im.value ?? "").trim(),
              displayMode: false,
              caption: undefined,
              source: pendingSource,
            } as AstNode;
            // Clear pendingSource after first use
            if (pendingSource) pendingSource = undefined; pendingProv = [];
            pushNode(fNode);
          }
          break;
        }

        // Plain paragraph
        const text = mdastText(child).trim();
        if (!text) break;
        // Skip if this paragraph is actually HTML source handled via html node (not paragraph)
        const pNode: AstNode = {
          type: "paragraph",
          text,
          source: pendingSource,
        } as AstNode;
        pushNode(pNode);
        break;
      }

      case "blockquote": {
        const mapped = parseBlockquote(child);
        if (mapped) {
          // Attach source if pending
          if (pendingSource && !(mapped as any).source) (mapped as any).source = pendingSource;
          attachProvenance(mapped);
          if (pendingSource) {
            pendingSource = undefined; pendingProv = [];
            pendingSourceParsed = undefined;
          }
          (mapped as any).paginationSafe = isPaginationSafeType(mapped.type);
          pushNode(mapped);
        }
        break;
      }

      case "math": {
        // Block math $$...$$
        const latex = (child.value ?? "").trim();
        if (!latex) break;
        // Look ahead for caption paragraph (e.g., "> معادلة الإنتاجية — ...")
        let caption: string | undefined;
        const next = tree.children[idx + 1] as any;
        if (next && next.type === "blockquote") {
          // Caption may be inside blockquote? Treat as paragraph after math is caption
          // skip — keep caption undefined, blockquote will be separate callout
        } else if (next && next.type === "paragraph") {
          const nxtText = mdastText(next).trim();
          // Heuristic: short caption line after formula, not starting with # or table
          if (nxtText.length > 0 && nxtText.length < 300 && !/^\|/.test(nxtText)) {
            // Check if following paragraph is not a heading and looks like caption (Arabic explanation)
            // Peek two ahead: if nextNext is heading or table, treat nxt as caption
            const nextNext = tree.children[idx + 2] as any;
            const isNextCaption = nextNext && ["heading", "table", "code", "math", "list"].includes(nextNext.type);
            // Also treat italic caption "*...*"
            if (isNextCaption || /معادلة|equation|caption/i.test(nxtText) || nxtText.startsWith(">")) {
              caption = nxtText.replace(/^\*+|\*+$/g, "").trim();
              idx++; // consume caption paragraph
            } else if (nxtText.length < 120 && !nxtText.includes("|")) {
              // Still consume as caption if short
              // Strict: only if nextNext is not paragraph
              if (!nextNext || nextNext.type !== "paragraph") {
                caption = nxtText;
                idx++;
              }
            }
          }
        }
        const fNode: AstNode = {
          type: "formula",
          latex,
          displayMode: true,
          caption,
          source: pendingSource,
        } as AstNode;
        pushNode(fNode);
        break;
      }

      case "table": {
        // GFM table -> ComparisonTable
        const headers: string[] = [];
        const rows: string[][] = [];
        // headers from first row
        const headRow = child.children?.[0];
        if (headRow && Array.isArray(headRow.children)) {
          for (const cell of headRow.children) {
            headers.push(mdastText(cell).trim());
          }
        }
        for (let r = 1; r < (child.children?.length ?? 0); r++) {
          const row = child.children[r];
          const cells: string[] = [];
          for (const cell of row.children) {
            cells.push(mdastText(cell).trim());
          }
          rows.push(cells);
        }
        // Look ahead for caption/source comment already pending
        const tNode: AstNode = {
          type: "table",
          headers: headers.length ? headers : ["Column"],
          rows: rows.length ? rows : [["—"]],
          caption: undefined,
          source: pendingSource,
        } as AstNode;
        // Also check if next html source should be caption? handled via pendingSource
        pushNode(tNode);
        break;
      }

      case "code": {
        const lang = (child.lang ?? undefined) as string | undefined;
        const code = (child.value ?? "").trim();
        if (!code) break;
        const cNode: AstNode = {
          type: "code",
          language: lang,
          code,
          source: pendingSource,
        } as AstNode;
        pushNode(cNode);
        break;
      }

      case "list": {
        const ordered = Boolean(child.ordered);
        const items: string[] = [];
        for (const item of child.children ?? []) {
          const txt = mdastText(item).trim();
          if (txt) items.push(txt);
        }
        if (items.length === 0) break;
        // Check if this list is under Summary section — keep as list, renderer will treat Summary as Card+List
        const lNode: AstNode = {
          type: "list",
          ordered,
          items,
          source: pendingSource,
        } as AstNode;
        // Lists are pagination-safe as Summary grouping? but spec says Summary => KeepTogether(Card(Heading+List))
        // So mark list as paginationSafe if inside summary/key-points
        const inSummary = currentSection?.name === "review" || currentSection?.name === "key-points" || currentSection?.name === "overview";
        (lNode as any).paginationSafe = inSummary ? true : false;
        pushNode(lNode);
        break;
      }

      case "html": {
        const val = (child.value ?? "").trim();
        if (!val) break;
        const handled = handleHtmlSource(val);
        if (!handled) {
          // Unknown html — treat as paragraph or ignore
          // Check if <!-- source --> already handled; else ignore
        }
        break;
      }

      case "thematicBreak": {
        // Divider — treat as paragraph or ignore; map to divider not in AST, skip
        break;
      }

      case "image": {
        // Rare top-level image (not wrapped in paragraph) — Figure
        const alt = (child.alt ?? "").trim();
        const src = (child.url ?? "").trim();
        const figNode: AstNode = {
          type: "figure",
          src: src || "figures/placeholder.png",
          alt: alt || "Figure",
          caption: alt || "Figure",
          source: pendingSource,
        } as AstNode;
        pushNode(figNode);
        break;
      }

      default: {
        // Fallback: try to extract text
        const txt = mdastText(child).trim();
        if (txt) {
          const pNode: AstNode = {
            type: "paragraph",
            text: txt,
            source: pendingSource,
          } as AstNode;
          pushNode(pNode);
        }
        break;
      }
    }
  }

  // Flush remaining section
  flushSection();

  // Ensure at least one section exists (fallback for h1-only docs)
  if (sections.length === 0 && nodes.length > 0) {
    sections.push({
      name: "custom",
      heading: frontmatter.title || "Untitled",
      nodes: [...nodes.filter((n) => n.type !== "heading" || (n as any).level !== 1)],
      source: pendingSource,
    });
  }

  // Build raw AST without paginationSafe extras for Zod validation
  const rawAST: any = {
    frontmatter,
    rawMarkdown: md,
    sections: sections.map((s) => ({
      name: s.name,
      heading: s.heading,
      nodes: s.nodes.map((n: any) => {
        const { paginationSafe, breakInside, ...rest } = n as any;
        return rest;
      }),
      source: s.source,
    })),
    nodes: nodes.map((n: any) => {
      const { paginationSafe, breakInside, ...rest } = n as any;
      return rest;
    }),
  };

  // Validate via Zod
  const validated = chapterASTSchema.parse(rawAST) as ChapterAST;

  // Re-attach paginationSafe and breakInside for renderer convenience (non-validated enrichment)
  const enrichedSections = validated.sections.map((sec: any, si: number) => ({
    ...sec,
    nodes: sec.nodes.map((n: any, ni: number) => {
      const original = sections[si]?.nodes[ni] ?? nodes[ni];
      return {
        ...n,
        paginationSafe: (original as any)?.paginationSafe ?? isPaginationSafeType(n.type),
        breakInside: (original as any)?.breakInside,
      };
    }),
  }));

  const enrichedNodes = (validated.nodes ?? []).map((n: any, i: number) => ({
    ...n,
    paginationSafe: (nodes[i] as any)?.paginationSafe ?? isPaginationSafeType(n.type),
    breakInside: (nodes[i] as any)?.breakInside,
  }));

  const ast: ChapterAST & { paginationSafe?: boolean } = {
    ...validated,
    sections: enrichedSections as any,
    nodes: enrichedNodes as any,
    // top-level flag for pagination safety (all KeepTogether elements present)
    paginationSafe: true,
  };

  return { frontmatter, ast };
}

export default parseMarkdown;
