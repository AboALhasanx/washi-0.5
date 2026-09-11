/**
 * lib/cgp/schemas.ts — CGP-0 Source Structure & Topic Discovery schemas.
 *
 * Content Generation Pipeline (CGP) artifacts live outside Washi ChapterAST.
 * They are research/analysis products that later phases (CGP-1+) consume.
 * Washi renderer/editor/publication code MUST NOT import from this module
 * except through the content pipeline tests and future CGP tooling.
 */

import { z } from "zod";

export const CGP_TOPIC_MAP_SCHEMA = "cgp.topic-map.v1" as const;

const importanceSchema = z.enum(["core", "supporting", "context"]);
const examRelevanceSchema = z.enum(["high", "medium", "low"]);
const coverageStatusSchema = z.enum(["full", "partial", "missing"]);
const preservationPrioritySchema = z.enum(["must", "should", "optional"]);

/** Provenance pointer into a declared source document. */
export const sourceRefSchema = z.object({
  sourceId: z.string().min(1),
  /** 1-based PDF/extract page numbers. Never invent. */
  pages: z.array(z.number().int().positive()).min(1),
  /** Optional printed-page hint when PDF page ≠ printed page. */
  printedPages: z.array(z.number().int().positive()).optional(),
  evidence: z.string().min(1).optional().describe("Short quote or paraphrase anchor"),
});

export const conceptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  examRelevance: examRelevanceSchema,
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const relationshipSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  type: z.enum([
    "affects",
    "differs-from",
    "measured-by",
    "depends-on",
    "example-of",
    "special-case-of",
    "confused-with",
    "part-of",
    "enables",
    "precedes",
    "contrasts",
  ]),
  to: z.string().min(1),
  note: z.string().min(1),
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const definitionRefSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1),
  definition: z.string().min(1),
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const formulaRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  latex: z.string().min(1),
  meaning: z.string().min(1),
  variables: z
    .array(
      z.object({
        symbol: z.string().min(1),
        meaning: z.string().min(1),
        unit: z.string().optional(),
      }),
    )
    .default([]),
  conditions: z.array(z.string()).default([]),
  relatedConceptIds: z.array(z.string()).default([]),
  commonErrors: z.array(z.string()).default([]),
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const exampleRefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  conceptIds: z.array(z.string()).default([]),
  inputs: z.array(z.string()).default([]),
  method: z.string().min(1),
  result: z.string().min(1),
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const comparisonRefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  axes: z.array(z.string()).min(1),
  items: z.array(z.string()).min(2),
  note: z.string().optional(),
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const applicationRefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  conceptIds: z.array(z.string()).default([]),
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const confusionRefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  left: z.string().min(1),
  right: z.string().min(1),
  trap: z.string().min(1),
  sourceRelevance: z.enum(["explicit", "implied", "not-in-source"]),
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const coverageRequirementSchema = z.object({
  id: z.string().min(1),
  requirement: z.string().min(1),
  preservationPriority: preservationPrioritySchema,
  rationale: z.string().min(1),
});

export const topicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  importance: importanceSchema,
  sourceSection: z.string().optional(),
  sourceRefs: z.array(sourceRefSchema).default([]),
  concepts: z.array(conceptSchema).default([]),
  relationships: z.array(relationshipSchema).default([]),
  definitions: z.array(definitionRefSchema).default([]),
  formulas: z.array(formulaRefSchema).default([]),
  examples: z.array(exampleRefSchema).default([]),
  comparisons: z.array(comparisonRefSchema).default([]),
  applications: z.array(applicationRefSchema).default([]),
  confusions: z.array(confusionRefSchema).default([]),
  coverageRequirements: z.array(coverageRequirementSchema).default([]),
});

export const sourceDocSchema = z.object({
  id: z.string().min(1),
  document: z.string().min(1),
  kind: z.enum(["extracted-pdf", "markdown-sample", "unverified-claim"]),
  path: z.string().optional(),
  pageCount: z.number().int().positive().optional(),
  availability: z.enum(["available", "unavailable", "partial"]),
  note: z.string().optional(),
});

export const baselineInventorySchema = z.object({
  markdownPath: z.string().min(1),
  sections: z.array(z.string()),
  sectionCount: z.number().int().nonnegative(),
  definitionCount: z.number().int().nonnegative(),
  formulaCount: z.object({
    display: z.number().int().nonnegative(),
    inline: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
  exampleBlockCount: z.number().int().nonnegative(),
  tableCount: z.number().int().nonnegative(),
  reviewQuestionCount: z.number().int().nonnegative(),
  calloutCount: z.number().int().nonnegative(),
  codeBlockCount: z.number().int().nonnegative(),
});

export const coverageComparisonSchema = z.object({
  method: z.string().min(1),
  /** Topic ids fully present in current markdown. */
  full: z.array(z.string()),
  partial: z.array(z.string()),
  missing: z.array(z.string()),
  /** Knowledge present in markdown but not supported by the primary source PDF. */
  markdownNotInSource: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      note: z.string().min(1),
    }),
  ),
});

export const topicMapSchema = z.object({
  schemaVersion: z.literal(CGP_TOPIC_MAP_SCHEMA),
  generatedAt: z.string().min(1),
  chapter: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    language: z.string().min(1),
    subject: z.string().min(1),
  }),
  sources: z.array(sourceDocSchema).min(1),
  baseline: baselineInventorySchema,
  topics: z.array(topicSchema).min(1),
  relationships: z.array(relationshipSchema).default([]),
  definitions: z.array(definitionRefSchema).default([]),
  formulas: z.array(formulaRefSchema).default([]),
  examples: z.array(exampleRefSchema).default([]),
  comparisons: z.array(comparisonRefSchema).default([]),
  confusions: z.array(confusionRefSchema).default([]),
  coverage: coverageComparisonSchema,
  missingAreas: z.array(
    z.object({
      topicId: z.string().min(1),
      title: z.string().min(1),
      importance: importanceSchema,
      reason: z.string().min(1),
      mustPreserve: z.array(z.string()).default([]),
    }),
  ),
  compressionGuard: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.enum([
        "relationship",
        "distinction",
        "formula",
        "condition",
        "worked-example",
        "trap",
        "definition",
        "taxonomy",
      ]),
      description: z.string().min(1),
      preservationPriority: preservationPrioritySchema,
      relatedIds: z.array(z.string()).default([]),
    }),
  ),
  qualityChecks: z.object({
    secondAiCanReconstructChapter: z.boolean(),
    notes: z.array(z.string()).default([]),
  }),
});

export type TopicMap = z.infer<typeof topicMapSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type SourceRef = z.infer<typeof sourceRefSchema>;

/** Structural validation beyond Zod shape: unique ids + source ref integrity. */
export function validateTopicMapIntegrity(map: TopicMap): string[] {
  const errors: string[] = [];
  const sourceIds = new Set(map.sources.map((s) => s.id));

  const allTopicIds = map.topics.map((t) => t.id);
  if (new Set(allTopicIds).size !== allTopicIds.length) {
    errors.push("duplicate topic ids");
  }

  const checkIds = (items: { id: string }[], label: string) => {
    const ids = items.map((i) => i.id);
    if (new Set(ids).size !== ids.length) errors.push(`duplicate ${label} ids`);
  };
  checkIds(map.formulas, "formula");
  checkIds(map.definitions, "definition");
  checkIds(map.examples, "example");
  checkIds(map.comparisons, "comparison");
  checkIds(map.confusions, "confusion");
  checkIds(map.relationships, "relationship");

  const checkSourceRefs = (refs: SourceRef[], where: string) => {
    for (const r of refs) {
      if (!sourceIds.has(r.sourceId)) {
        errors.push(`${where}: unknown sourceId ${r.sourceId}`);
      }
    }
  };

  for (const t of map.topics) {
    checkSourceRefs(t.sourceRefs, `topic ${t.id}`);
    for (const c of t.concepts) checkSourceRefs(c.sourceRefs, `concept ${c.id}`);
    for (const f of t.formulas) checkSourceRefs(f.sourceRefs, `formula ${f.id}`);
    for (const d of t.definitions) checkSourceRefs(d.sourceRefs, `definition ${d.id}`);
    for (const e of t.examples) checkSourceRefs(e.sourceRefs, `example ${e.id}`);
    if (t.importance === "core" && t.sourceRefs.length === 0) {
      const srcAvailable = map.sources.some((s) => s.availability === "available");
      if (srcAvailable) errors.push(`core topic ${t.id} lacks sourceRefs`);
    }
    for (const req of t.coverageRequirements) {
      if (!req.requirement.trim()) errors.push(`empty coverage requirement in ${t.id}`);
    }
  }

  const covered = new Set([...map.coverage.full, ...map.coverage.partial, ...map.coverage.missing]);
  for (const t of map.topics) {
    if (!covered.has(t.id)) {
      errors.push(`topic ${t.id} missing from coverage.full|partial|missing`);
    }
  }

  return errors;
}

export function parseTopicMap(data: unknown): TopicMap {
  const map = topicMapSchema.parse(data);
  const integrity = validateTopicMapIntegrity(map);
  if (integrity.length) {
    throw new Error(`CGP topic map integrity failed:\n- ${integrity.join("\n- ")}`);
  }
  return map;
}
