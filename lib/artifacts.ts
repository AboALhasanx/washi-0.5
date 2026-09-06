/**
 * lib/artifacts.ts
 * Washi 0.5 publication artifacts derived from the ChapterAST:
 *
 * - document.ast — the cleaned, provenance-carrying document model
 *   (the "intelligent derived representation"; hidden provenance included,
 *   Admin/Debug consumers only).
 * - app-content.json — the platform-consumer content model. The educational
 *   platform displays; it does not author. Definitions become flashcard
 *   candidates, review items become question candidates, every block keeps
 *   a stable id so questions can be linked to concepts later.
 */

import type { ChapterAST, AstNode, ProvenanceRef } from "./schemas";

// ── document.ast ─────────────────────────────────────────────────────────────

function cleanNode(n: any): any {
  const { paginationSafe, breakInside, ...rest } = n;
  return rest;
}

export interface DocumentAst {
  schema: "washi.document-ast/0.5";
  generatedAt: string;
  frontmatter: ChapterAST["frontmatter"];
  sections: Array<{
    id: string;
    name: string;
    heading: string;
    provenance?: ProvenanceRef[];
    nodes: Array<any & { id: string }>;
  }>;
  stats: {
    sections: number;
    blocks: number;
    definitions: number;
    formulas: number;
    tables: number;
    figures: number;
    provenanceBlocks: number;
  };
}

/** Build the document.ast artifact: stable block ids + hidden provenance. */
export function buildDocumentAst(ast: ChapterAST): DocumentAst {
  let blockCounter = 0;
  const sections = ast.sections.map((sec, si) => {
    const nodes = sec.nodes.map((n: AstNode, ni: number) => {
      blockCounter += 1;
      return { ...cleanNode(n), id: `b${si + 1}-${ni + 1}` };
    });
    const cleaned: any = cleanNode(sec as any);
    return {
      id: `s${si + 1}`,
      name: cleaned.name,
      heading: cleaned.heading,
      source: cleaned.source,
      provenance: cleaned.provenance,
      nodes,
    };
  });

  const allNodes = sections.flatMap((s) => s.nodes);
  const withProv = allNodes.filter((n: any) => Array.isArray(n.provenance) && n.provenance.length > 0);

  return {
    schema: "washi.document-ast/0.5",
    generatedAt: new Date().toISOString(),
    frontmatter: ast.frontmatter,
    sections,
    stats: {
      sections: sections.length,
      blocks: allNodes.length,
      definitions: allNodes.filter((n: any) => n.type === "definition").length,
      formulas: allNodes.filter((n: any) => n.type === "formula").length,
      tables: allNodes.filter((n: any) => n.type === "table").length,
      figures: allNodes.filter((n: any) => n.type === "figure").length,
      provenanceBlocks: withProv.length,
    },
  };
}

// ── app-content.json ─────────────────────────────────────────────────────────

export interface AppContent {
  schema: "washi.app-content/0.5";
  generatedAt: string;
  title: string;
  subject: string;
  language: "ar" | "en";
  sections: Array<{
    id: string;
    name: string;
    heading: string;
    blocks: Array<{ id: string; type: string; [k: string]: unknown }>;
  }>;
  /** Platform-facing concept index derived from definition blocks. */
  concepts: Array<{
    id: string;
    term: string;
    definition: string;
    blockId: string;
    sectionId: string;
  }>;
  /** Question candidates extracted from review sections. */
  questionCandidates: Array<{
    id: string;
    text: string;
    sectionId: string;
    /** concept ids present in the same document — for later linking */
    suggestedConceptIds: string[];
  }>;
  /** Flashcard candidates: front = term, back = definition. */
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    conceptId: string;
  }>;
  stats: AppContentStats;
}

interface AppContentStats {
  blocks: number;
  concepts: number;
  flashcards: number;
  questionCandidates: number;
}

/**
 * The platform says "show this definition", not "edit this definition".
 * app-content.json is exactly that read model.
 */
export function buildAppContent(ast: ChapterAST): AppContent {
  const doc = buildDocumentAst(ast);

  const concepts: AppContent["concepts"] = [];
  const flashcards: AppContent["flashcards"] = [];
  const questionCandidates: AppContent["questionCandidates"] = [];

  for (const sec of doc.sections) {
    for (const node of sec.nodes) {
      if (node.type === "definition") {
        const conceptId = `c-${node.id}`;
        concepts.push({
          id: conceptId,
          term: String(node.term ?? ""),
          definition: String(node.definition ?? ""),
          blockId: node.id,
          sectionId: sec.id,
        });
        flashcards.push({
          id: `f-${node.id}`,
          front: String(node.term ?? ""),
          back: String(node.definition ?? ""),
          conceptId,
        });
      }
      if (sec.name === "review" && node.type === "list") {
        const items = Array.isArray(node.items) ? node.items : [];
        for (let i = 0; i < items.length; i++) {
          questionCandidates.push({
            id: `q-${node.id}-${i + 1}`,
            text: String(items[i]),
            sectionId: sec.id,
            suggestedConceptIds: concepts.map((c) => c.id),
          });
        }
      }
    }
  }

  const blockCount = doc.sections.reduce((s, sec) => s + sec.nodes.length, 0);

  return {
    schema: "washi.app-content/0.5",
    generatedAt: doc.generatedAt,
    title: ast.frontmatter.title,
    subject: ast.frontmatter.subject,
    language: ast.frontmatter.language,
    sections: doc.sections.map((s) => ({
      id: s.id,
      name: s.name,
      heading: s.heading,
      blocks: s.nodes.map((n: any) => ({ id: n.id, type: n.type, ...payloadFor(n) })),
    })),
    concepts,
    questionCandidates,
    flashcards,
    stats: {
      blocks: blockCount,
      concepts: concepts.length,
      flashcards: flashcards.length,
      questionCandidates: questionCandidates.length,
    },
  };
}

function payloadFor(node: any): Record<string, unknown> {
  // Keep the platform-relevant payload; drop provenance (Admin/Debug only)
  // and renderer internals.
  const { id, type, source, provenance, paginationSafe, breakInside, ...payload } = node;
  return payload;
}
