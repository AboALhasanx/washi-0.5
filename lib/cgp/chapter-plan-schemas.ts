/**
 * lib/cgp/chapter-plan-schemas.ts — CGP-3 chapter-plan.v1
 * Teaching architecture for CGP-4. Not final prose.
 */

import { z } from "zod";
import { sourceRefSchema } from "./schemas";

export const CGP_CHAPTER_PLAN_SCHEMA = "cgp.chapter-plan.v1" as const;

export const depthLevelSchema = z.enum([
  "FOUNDATIONAL",
  "EXPLANATORY",
  "DETAILED",
  "APPLIED",
  "EXAM-CRITICAL",
]);

const teachingRoleSchema = z.enum([
  "primary",
  "secondary-reference",
  "optional-context",
  "exam-target",
]);

export const knowledgeAssignmentSchema = z.object({
  entityId: z.string().min(1),
  kind: z.enum([
    "topic",
    "concept",
    "relationship",
    "definition",
    "example",
    "comparison",
    "formula",
    "confusion",
    "coverage-requirement",
  ]),
  primarySectionId: z.string().min(1),
  teachingRole: teachingRoleSchema,
  depth: depthLevelSchema,
  mustPreserve: z.boolean().default(false),
  referencedFrom: z.array(z.string()).default([]),
  sourceRefs: z.array(sourceRefSchema).default([]),
  reason: z.string().optional(),
});

export const chapterPlanSectionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  arabicTitleHint: z.string().min(1).optional(),
  purpose: z.string().min(1),
  whyItExists: z.string().min(1),
  depth: depthLevelSchema,
  sourceWeight: z.object({
    pages: z.array(z.number().int().positive()),
    conceptCount: z.number().int().nonnegative(),
    relationshipCount: z.number().int().nonnegative(),
    exerciseSignalCount: z.number().int().nonnegative(),
    signal: z.enum(["light", "moderate", "heavy"]),
  }),
  sourceRefs: z.array(sourceRefSchema).default([]),
  topicIds: z.array(z.string()).min(1),
  conceptIds: z.array(z.string()).min(1),
  relationshipIds: z.array(z.string()).default([]),
  definitionIds: z.array(z.string()).default([]),
  exampleIds: z.array(z.string()).default([]),
  comparisonIds: z.array(z.string()).default([]),
  formulaIds: z.array(z.string()).default([]),
  confusionIds: z.array(z.string()).default([]),
  prerequisiteConceptIds: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string().min(1)).min(1),
  teachingSequence: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        kind: z.enum([
          "introduce",
          "explain",
          "relate",
          "example",
          "compare",
          "formula",
          "exam-note",
          "bridge",
          "summarize",
        ]),
        conceptIds: z.array(z.string()).default([]),
        detail: z.string().min(1),
        washHint: z
          .enum(["prose", "definition-card", "list", "table", "formula", "callout", "code"])
          .default("prose"),
      }),
    )
    .min(1),
  mustPreserve: z.array(z.string().min(1)).min(1),
  transitions: z.object({
    entryFrom: z.string().min(1).optional(),
    exitTo: z.string().min(1).optional(),
  }),
  cardPolicy: z.array(z.string()).default([]),
  tablePolicy: z.array(z.string()).default([]),
});

export const chapterPlanSchema = z.object({
  schemaVersion: z.literal(CGP_CHAPTER_PLAN_SCHEMA),
  generatedAt: z.string().min(1),
  basedOn: z.object({
    topicMap: z.literal("cgp.topic-map.v1"),
    deepTopics: z.literal("cgp.deep-topics.v1"),
    validation: z.literal("cgp.validation.v1"),
    composition: z.literal("cgp.composition.v1"),
  }),
  metadata: z.object({
    chapterId: z.string().min(1),
    title: z.string().min(1),
    arabicTitleHint: z.string().min(1),
    subject: z.string().min(1),
    language: z.string().min(1),
  }),
  chapterPurpose: z.string().min(1),
  learningArc: z.array(z.string().min(1)).min(1),
  chapterLearningObjectives: z.array(z.string().min(1)).min(3),
  dependencyGraph: z.array(
    z.object({
      from: z.string().min(1),
      to: z.string().min(1),
      note: z.string().min(1),
    }),
  ),
  sections: z.array(chapterPlanSectionSchema).min(8),
  knowledgeCoverage: z.array(knowledgeAssignmentSchema).min(20),
  compositionRules: z.array(z.string().min(1)).min(5),
  externalContextPolicy: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      decision: z.enum(["exclude", "optional", "needs-separate-source", "future-chapter"]),
      placement: z.string().optional(),
      note: z.string().min(1),
    }),
  ),
  reviewPlan: z.object({
    purpose: z.string().min(1),
    categories: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        skill: z.string().min(1),
        conceptIds: z.array(z.string()).min(1),
        countHint: z.number().int().positive(),
        sourceSignalIds: z.array(z.string()).default([]),
      }),
    ),
    practiceClassification: z.object({
      core: z.array(z.string()),
      optionalResearch: z.array(z.string()),
      futureExpansion: z.array(z.string()),
    }),
    exclusions: z.array(z.string()).default([]),
  }),
  provenancePlan: z.object({
    washCommentPattern: z.string().min(1),
    rule: z.string().min(1),
    externalMarking: z.string().min(1),
  }),
  compressionGuards: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.string().min(1),
      description: z.string().min(1),
      appearsAs: z.string().min(1),
      appearsInSectionId: z.string().min(1),
      requiredDepth: depthLevelSchema,
    }),
  ),
  qualityChecks: z.object({
    allCoreTopicsAssigned: z.boolean(),
    allMustPreserveAssigned: z.boolean(),
    allSourceFormulasAssigned: z.boolean(),
    noDuplicatePrimaryConceptTeaching: z.boolean(),
    externalNotSmuggledIntoCore: z.boolean(),
    noArbitraryPageTarget: z.boolean(),
  }),
  omissions: z.array(
    z.object({
      entityId: z.string().min(1),
      reason: z.string().min(1),
      disposition: z.string().min(1),
    }),
  ),
});

export type ChapterPlan = z.infer<typeof chapterPlanSchema>;

export function parseChapterPlan(data: unknown): ChapterPlan {
  return chapterPlanSchema.parse(data);
}

export function validateChapterPlanIntegrity(plan: ChapterPlan): string[] {
  const errors: string[] = [];
  const sectionIds = plan.sections.map((s) => s.id);
  if (new Set(sectionIds).size !== sectionIds.length) errors.push("duplicate section ids");

  const orders = plan.sections.map((s) => s.order);
  if (new Set(orders).size !== orders.length) errors.push("duplicate section orders");

  const sectionIdSet = new Set(sectionIds);
  const conceptPrimaries = new Map<string, string>();

  for (const a of plan.knowledgeCoverage) {
    if (!sectionIdSet.has(a.primarySectionId)) {
      errors.push(`${a.entityId} unknown primary section ${a.primarySectionId}`);
    }
    for (const r of a.referencedFrom) {
      if (!sectionIdSet.has(r)) errors.push(`${a.entityId} unknown referencedFrom ${r}`);
    }
    if (a.kind === "concept") {
      if (conceptPrimaries.has(a.entityId)) {
        errors.push(`concept ${a.entityId} has multiple primary sections`);
      }
      conceptPrimaries.set(a.entityId, a.primarySectionId);
    }
  }

  // Every section conceptIds should have a coverage entry with that primary section
  const coverageByKey = new Map(
    plan.knowledgeCoverage.map((a) => [`${a.kind}:${a.entityId}`, a]),
  );
  for (const s of plan.sections) {
    for (const cid of s.conceptIds) {
      const a = coverageByKey.get(`concept:${cid}`);
      if (!a) {
        errors.push(`section ${s.id} concept ${cid} missing from knowledgeCoverage`);
      } else if (a.primarySectionId !== s.id && !a.referencedFrom.includes(s.id)) {
        errors.push(`section ${s.id} concept ${cid} not owned/referenced`);
      }
    }
    for (const fid of s.formulaIds) {
      const a = coverageByKey.get(`formula:${fid}`);
      if (!a) errors.push(`section ${s.id} formula ${fid} missing from knowledgeCoverage`);
    }
  }

  for (const g of plan.compressionGuards) {
    if (!sectionIdSet.has(g.appearsInSectionId)) {
      errors.push(`guard ${g.id} unknown section`);
    }
  }

  if (!plan.qualityChecks.allCoreTopicsAssigned) errors.push("core topics not all assigned");
  if (!plan.qualityChecks.allMustPreserveAssigned) errors.push("must-preserve not all assigned");
  if (!plan.qualityChecks.allSourceFormulasAssigned) errors.push("source formulas not assigned");
  if (!plan.qualityChecks.noDuplicatePrimaryConceptTeaching) {
    errors.push("duplicate primary concept teaching");
  }
  if (!plan.qualityChecks.externalNotSmuggledIntoCore) errors.push("external in core");
  if (!plan.qualityChecks.noArbitraryPageTarget) errors.push("arbitrary page target present");

  return errors;
}
