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

import type { ChapterAST, AstNode, DocumentAst, AppContent, AstNodeWithId } from "./schemas";
import { AST_SCHEMA, APP_CONTENT_SCHEMA } from "./version";

// The artifact shapes are INFERRED from their Zod schemas (lib/schemas.ts), not
// hand-maintained here — a contract that is written twice drifts. Re-exported
// so callers keep importing from the module that builds them.
export type { DocumentAst, AppContent };

// ── document.ast ─────────────────────────────────────────────────────────────

function cleanNode(n: any): any {
  const { paginationSafe, breakInside, ...rest } = n;
  return rest;
}

/** Build the document.ast artifact: stable block ids + hidden provenance. */
export function buildDocumentAst(ast: ChapterAST): DocumentAst {
  let blockCounter = 0;
  const sections = ast.sections.map((sec, si) => {
    const nodes: AstNodeWithId[] = sec.nodes.map((n: AstNode, ni: number) => {
      blockCounter += 1;
      return { ...cleanNode(n), id: `b${si + 1}-${ni + 1}` } as AstNodeWithId;
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
    schema: AST_SCHEMA,
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

/**
 * The platform says "show this definition", not "edit this definition".
 * app-content.json is exactly that read model.
 */
export function buildAppContent(ast: ChapterAST): AppContent {
  const doc = buildDocumentAst(ast);

  const concepts: AppContent["concepts"] = [];
  const flashcards: AppContent["flashcards"] = [];
  const questionCandidates: AppContent["questionCandidates"] = [];

  // Pass 1 — concepts and flashcards. Done before questions so a definition
  // that appears AFTER the review section is still linkable.
  for (const sec of doc.sections) {
    for (const node of sec.nodes) {
      if (node.type !== "definition") continue;
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
  }

  // Pass 2 — question candidates, each linked only to the concepts it names.
  for (const sec of doc.sections) {
    if (sec.name !== "review") continue;
    for (const node of sec.nodes) {
      if (node.type !== "list") continue;
      const items = Array.isArray(node.items) ? node.items : [];
      for (let i = 0; i < items.length; i++) {
        const text = String(items[i]);
        questionCandidates.push({
          id: `q-${node.id}-${i + 1}`,
          text,
          sectionId: sec.id,
          suggestedConceptIds: suggestConceptIds(text, concepts),
        });
      }
    }
  }

  const blockCount = doc.sections.reduce((s, sec) => s + sec.nodes.length, 0);

  return {
    schema: APP_CONTENT_SCHEMA,
    generatedAt: doc.generatedAt,
    title: ast.frontmatter.title,
    subject: ast.frontmatter.subject,
    language: ast.frontmatter.language,
    sections: doc.sections.map((s) => ({
      id: s.id,
      name: s.name,
      heading: s.heading,
      // key order (id, type, then payload) is part of the serialized artifact
      blocks: s.nodes.map(
        (n) => ({ id: n.id, type: n.type, ...payloadFor(n) }) as AppContent["sections"][number]["blocks"][number]
      ),
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

/**
 * Fold the Arabic (and Latin) spelling variants that would otherwise hide an
 * obvious match: harakat, tatweel, آأإا, ى→ي, ة→ه. Matching stays a plain
 * substring test — deliberately fuzzy toward recall, because the output is a
 * *suggestion* a human confirms in the Studio, never an automatic link.
 */
function normalizeForMatch(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[\u0622\u0623\u0625\u0627]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Concepts a question actually mentions.
 *
 * The previous behaviour attached EVERY concept in the document to EVERY
 * question — with 7 concepts that is 7 suggestions per question, all but one
 * of them noise. An empty array is honest: the platform shows "no suggestion,
 * link manually" instead of a pre-filled wrong answer.
 */
function suggestConceptIds(question: string, concepts: AppContent["concepts"]): string[] {
  const q = normalizeForMatch(question);
  if (!q) return [];
  return concepts
    .filter((c) => {
      const term = normalizeForMatch(c.term);
      return term.length > 1 && q.includes(term);
    })
    .map((c) => c.id);
}

function payloadFor(node: any): Record<string, unknown> {
  // Keep the platform-relevant payload; drop provenance (Admin/Debug only)
  // and renderer internals.
  const { id, type, source, provenance, paginationSafe, breakInside, ...payload } = node;
  return payload;
}
