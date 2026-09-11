/**
 * lib/cgp/deep-schemas.ts — CGP-1 Topic Deep Extraction schemas.
 * Extends CGP-0 topic map with evidence-classified deep knowledge records.
 */

import { z } from "zod";
import { sourceRefSchema, CGP_TOPIC_MAP_SCHEMA } from "./schemas";

export const CGP_DEEP_TOPICS_SCHEMA = "cgp.deep-topics.v1" as const;

export const claimClassSchema = z.enum([
  "DIRECT_SOURCE",
  "NECESSARY_EXPLANATION",
  "EXTERNAL_CONTEXT",
  "UNSUPPORTED",
]);

const examRelevanceSchema = z.enum(["high", "medium", "low"]);
const importanceSchema = z.enum(["core", "supporting", "context"]);
const evidenceQualitySchema = z.enum(["high", "medium", "limited"]);

export const deepConceptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  meaning: z.string().min(1),
  explanation: z
    .object({
      what: z.string().min(1),
      why: z.string().min(1).optional(),
      how: z.string().min(1).optional(),
      parts: z.array(z.string()).default([]),
      whenChanges: z.string().min(1).optional(),
      concrete: z.string().min(1).optional(),
      notMeaning: z.string().min(1).optional(),
    })
    .strict(),
  importance: examRelevanceSchema,
  whyExamRelevant: z.string().min(1),
  claimClass: claimClassSchema,
  sourceRefs: z.array(sourceRefSchema).default([]),
  prerequisites: z.array(z.string()).default([]),
  relatedConceptIds: z.array(z.string()).default([]),
  commonConfusionIds: z.array(z.string()).default([]),
});

export const deepDefinitionSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1),
  definition: z.string().min(1),
  scope: z.string().min(1).optional(),
  qualifier: z.string().min(1).optional(),
  authoritative: z.boolean().default(false),
  claimClass: claimClassSchema,
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const deepRelationshipSchema = z.object({
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
  explanation: z.string().min(1),
  claimClass: claimClassSchema,
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const deepFormulaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  latex: z.string().min(1),
  measures: z.string().min(1),
  whenUsed: z.string().min(1),
  variables: z
    .array(
      z.object({
        symbol: z.string().min(1),
        meaning: z.string().min(1),
        unit: z.string().optional(),
      }),
    )
    .min(1),
  conditions: z.array(z.string()).min(1),
  interpretation: z.string().min(1),
  variableChangeEffects: z.array(z.string()).default([]),
  commonMistakes: z.array(z.string()).default([]),
  sourceExampleId: z.string().optional(),
  claimClass: claimClassSchema,
  sourceRefs: z.array(sourceRefSchema).min(1),
});

export const deepExampleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  conceptIds: z.array(z.string()).min(1),
  scenario: z.string().min(1),
  inputs: z.array(z.string()).default([]),
  reasoning: z.array(z.string()).default([]),
  result: z.string().min(1),
  lesson: z.string().min(1),
  claimClass: claimClassSchema,
  sourceRefs: z.array(sourceRefSchema).min(1),
});

export const deepComparisonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  items: z.array(z.string()).min(2),
  axes: z
    .array(
      z.object({
        axis: z.string().min(1),
        values: z.record(z.string(), z.string()),
      }),
    )
    .min(1),
  similarities: z.array(z.string()).default([]),
  commonTrap: z.string().optional(),
  claimClass: claimClassSchema,
  sourceRefs: z.array(sourceRefSchema).min(1),
});

export const deepConfusionSchema = z.object({
  id: z.string().min(1),
  left: z.string().min(1),
  right: z.string().min(1),
  whyConfused: z.string().min(1),
  correctDistinction: z.string().min(1),
  examTrap: z.string().min(1),
  sourceRelevance: z.enum(["explicit", "implied", "not-in-source"]),
  claimClass: claimClassSchema,
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const deepApplicationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  conceptIds: z.array(z.string()).default([]),
  detail: z.string().min(1),
  claimClass: claimClassSchema,
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const exerciseSignalSchema = z.object({
  id: z.string().min(1),
  sourceQuestionNumber: z.union([z.number().int().positive(), z.string()]),
  conceptIds: z.array(z.string()).default([]),
  skill: z.enum(["identify", "define", "compare", "compute", "apply", "analyze", "draw"]),
  formulaTested: z.string().optional(),
  distinctionTested: z.string().optional(),
  difficultySignal: z.enum(["basic", "intermediate", "advanced"]).optional(),
  claimClass: z.literal("DIRECT_SOURCE"),
  sourceRefs: z.array(sourceRefSchema).min(1),
});

export const deepTopicSchema = z.object({
  topicId: z.string().min(1),
  title: z.string().min(1),
  importance: importanceSchema,
  sourceSection: z.string().optional(),
  sourceRefs: z.array(sourceRefSchema).min(1),
  learningObjectives: z.array(z.string().min(1)).min(1),
  concepts: z.array(deepConceptSchema).default([]),
  relationships: z.array(deepRelationshipSchema).default([]),
  definitions: z.array(deepDefinitionSchema).default([]),
  formulas: z.array(deepFormulaSchema).default([]),
  examples: z.array(deepExampleSchema).default([]),
  comparisons: z.array(deepComparisonSchema).default([]),
  applications: z.array(deepApplicationSchema).default([]),
  confusions: z.array(deepConfusionSchema).default([]),
  exerciseSignals: z.array(exerciseSignalSchema).default([]),
  prerequisites: z.array(z.string()).default([]),
  dependents: z.array(z.string()).default([]),
  preservationRequirements: z.array(z.string().min(1)).min(1),
  simplificationControl: z.object({
    acceptable: z.array(z.string()).default([]),
    notAcceptable: z.array(z.string()).default([]),
  }),
  evidenceQuality: evidenceQualitySchema,
  coverage: z.object({
    definition: z.boolean(),
    mechanism: z.boolean(),
    relationships: z.boolean(),
    examples: z.boolean(),
    comparisons: z.boolean(),
    formulas: z.boolean(),
    confusions: z.boolean(),
  }),
  uncertainties: z.array(z.string()).default([]),
});

export const externalMaterialSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  presentInSample: z.boolean(),
  claimClass: claimClassSchema,
  note: z.string().min(1),
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const deepTopicsSchema = z.object({
  schemaVersion: z.literal(CGP_DEEP_TOPICS_SCHEMA),
  generatedAt: z.string().min(1),
  basedOnTopicMap: z.literal(CGP_TOPIC_MAP_SCHEMA),
  chapter: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    language: z.string().min(1),
    subject: z.string().min(1),
  }),
  sources: z
    .array(
      z.object({
        id: z.string().min(1),
        document: z.string().min(1),
        availability: z.enum(["available", "unavailable", "partial"]),
        pageCount: z.number().int().positive().optional(),
      }),
    )
    .min(1),
  processingOrder: z.array(z.string()).min(1),
  topics: z.array(deepTopicSchema).min(1),
  externalUnverifiedMaterial: z.array(externalMaterialSchema).default([]),
  crossTopicFlags: z
    .array(
      z.object({
        id: z.string().min(1),
        severity: z.enum(["info", "review"]),
        message: z.string().min(1),
        relatedTopicIds: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  qualityChecks: z.object({
    cgp3CanTeachWithoutSource: z.boolean(),
    notes: z.array(z.string()).default([]),
  }),
});

export type DeepTopics = z.infer<typeof deepTopicsSchema>;
export type DeepTopic = z.infer<typeof deepTopicSchema>;

export function validateDeepTopicsIntegrity(map: DeepTopics): string[] {
  const errors: string[] = [];
  const sourceIds = new Set(map.sources.map((s) => s.id));
  const topicIds = map.topics.map((t) => t.topicId);
  if (new Set(topicIds).size !== topicIds.length) errors.push("duplicate topicId values");

  const allConceptIds: string[] = [];
  for (const t of map.topics) {
    allConceptIds.push(...t.concepts.map((c) => c.id));
    const local = new Set(t.concepts.map((c) => c.id));
    if (local.size !== t.concepts.length) errors.push(`duplicate concept ids in ${t.topicId}`);

    const checkRefs = (refs: { sourceId: string }[], where: string) => {
      for (const r of refs) {
        if (!sourceIds.has(r.sourceId)) errors.push(`${where}: unknown sourceId ${r.sourceId}`);
      }
    };
    checkRefs(t.sourceRefs, t.topicId);
    for (const c of t.concepts) checkRefs(c.sourceRefs, c.id);
    for (const f of t.formulas) checkRefs(f.sourceRefs, f.id);
    for (const e of t.examples) checkRefs(e.sourceRefs, e.id);
    for (const d of t.definitions) checkRefs(d.sourceRefs, d.id);

    const fids = t.formulas.map((f) => f.id);
    if (new Set(fids).size !== fids.length) errors.push(`duplicate formula ids in ${t.topicId}`);
    const eids = t.examples.map((e) => e.id);
    if (new Set(eids).size !== eids.length) errors.push(`duplicate example ids in ${t.topicId}`);

    // DIRECT_SOURCE claims must have source evidence
    for (const c of t.concepts) {
      if (c.claimClass === "DIRECT_SOURCE" && c.sourceRefs.length === 0) {
        errors.push(`DIRECT_SOURCE concept ${c.id} lacks sourceRefs`);
      }
      if (c.claimClass === "UNSUPPORTED") {
        errors.push(`UNSUPPORTED concept ${c.id} must not ship in deep record`);
      }
    }
    for (const f of t.formulas) {
      if (f.claimClass === "DIRECT_SOURCE" && f.sourceRefs.length === 0) {
        errors.push(`DIRECT_SOURCE formula ${f.id} lacks sourceRefs`);
      }
    }
    if (t.importance === "core" && t.evidenceQuality === "limited") {
      errors.push(`core topic ${t.topicId} has limited evidenceQuality`);
    }
    if (t.preservationRequirements.length === 0) {
      errors.push(`topic ${t.topicId} missing preservationRequirements`);
    }
  }

  if (new Set(allConceptIds).size !== allConceptIds.length) {
    errors.push("duplicate concept ids across topics");
  }

  for (const id of map.processingOrder) {
    if (!topicIds.includes(id)) errors.push(`processingOrder unknown topic ${id}`);
  }

  return errors;
}

export function parseDeepTopics(data: unknown): DeepTopics {
  const parsed = deepTopicsSchema.parse(data);
  const integrity = validateDeepTopicsIntegrity(parsed);
  if (integrity.length) {
    throw new Error(`CGP deep topics integrity failed:\n- ${integrity.join("\n- ")}`);
  }
  return parsed;
}
