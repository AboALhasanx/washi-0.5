/**
 * lib/cgp/composition-schemas.ts — CGP-3 chapter composition blueprint schema.
 * Teaching architecture only — not final prose.
 */

import { z } from "zod";
import { sourceRefSchema } from "./schemas";

export const CGP_COMPOSITION_SCHEMA = "cgp.composition.v1" as const;

const provenanceClassSchema = z.enum([
  "SOURCE_CORE",
  "SOURCE_CONTEXT",
  "EXTERNAL_ENRICHMENT",
]);

export const compositionUnitSchema = z.object({
  conceptId: z.string().min(1),
  role: z.enum([
    "anchor",
    "definition",
    "mechanism",
    "taxonomy",
    "taxonomy-member",
    "distinction",
    "bridge",
    "example",
    "exam-target",
  ]),
  depth: z.enum(["introduce", "explain", "deep", "reference"]),
  provenance: provenanceClassSchema,
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  arabicTitleHint: z.string().min(1).optional(),
  purpose: z.string().min(1),
  pedagogicalRole: z.enum([
    "roadmap",
    "foundation",
    "taxonomy",
    "mechanism",
    "structure",
    "application",
    "architecture",
    "integration",
    "bridge",
    "review",
  ]),
  sourceRefs: z.array(sourceRefSchema).default([]),
  topicIds: z.array(z.string()).min(1),
  /** Ordered teaching beats inside the section. */
  sequence: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        kind: z.enum([
          "explanation",
          "definition",
          "taxonomy",
          "relationship",
          "mechanism",
          "example",
          "comparison",
          "formula",
          "exam-note",
          "bridge",
        ]),
        conceptIds: z.array(z.string()).default([]),
        detail: z.string().min(1),
        provenance: provenanceClassSchema,
      }),
    )
    .min(1),
  requiredConcepts: z.array(compositionUnitSchema).min(1),
  requiredRelationshipIds: z.array(z.string()).default([]),
  definitions: z
    .array(
      z.object({
        definitionId: z.string().min(1),
        treatment: z.enum(["strong-card", "inline-prose", "sidebar"]),
        reason: z.string().min(1),
      }),
    )
    .default([]),
  examples: z
    .array(
      z.object({
        exampleId: z.string().min(1),
        placement: z.string().min(1),
        mustShowReasoning: z.boolean().default(true),
      }),
    )
    .default([]),
  comparisons: z
    .array(
      z.object({
        comparisonId: z.string().min(1),
        placement: z.string().min(1),
      }),
    )
    .default([]),
  formulas: z
    .array(
      z.object({
        formulaId: z.string().min(1),
        placement: z.string().min(1),
        surroundWith: z.array(z.string()).min(1),
      }),
    )
    .default([]),
  examFocus: z
    .array(
      z.object({
        conceptId: z.string().min(1),
        focus: z.string().min(1),
        confusionIds: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  explanationIntents: z.array(z.string().min(1)).min(1),
  proseIntents: z.object({
    opening: z.string().min(1),
    mechanism: z.string().min(1),
    distinction: z.string().min(1).optional(),
    exampleNarrative: z.string().min(1).optional(),
    connectionPrevNext: z.string().min(1),
  }),
  entryConcept: z.string().min(1),
  bridgeToNext: z.string().min(1),
  coverage: z.object({
    minimum: z.array(z.string()).min(1),
    mustPreserve: z.array(z.string()).min(1),
    optional: z.array(z.string()).default([]),
  }),
  densityMix: z.object({
    explanation: z.boolean(),
    prose: z.boolean(),
    definition: z.boolean(),
    example: z.boolean(),
    comparison: z.boolean(),
    formula: z.boolean(),
    examNote: z.boolean(),
  }),
});

export const reviewPlanSchema = z.object({
  purpose: z.string().min(1),
  categories: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      skill: z.string().min(1),
      conceptIds: z.array(z.string()).min(1),
      sourceSignalIds: z.array(z.string()).default([]),
      countHint: z.number().int().positive(),
    }),
  ),
  exclusions: z.array(z.string()).default([]),
});

export const compositionSchema = z.object({
  schemaVersion: z.literal(CGP_COMPOSITION_SCHEMA),
  generatedAt: z.string().min(1),
  chapterId: z.string().min(1),
  title: z.string().min(1),
  arabicTitleHint: z.string().min(1).optional(),
  subject: z.string().min(1),
  language: z.string().min(1),
  basedOn: z.object({
    topicMap: z.literal("cgp.topic-map.v1"),
    deepTopics: z.literal("cgp.deep-topics.v1"),
    validation: z.literal("cgp.validation.v1"),
  }),
  designPrinciples: z.array(z.string().min(1)).min(1),
  chapterObjectives: z.array(z.string().min(1)).min(1),
  learningArc: z.array(z.string().min(1)).min(1),
  sections: z.array(sectionSchema).min(5),
  crossTopicConnections: z.array(
    z.object({
      id: z.string().min(1),
      fromConceptId: z.string().min(1),
      toConceptId: z.string().min(1),
      note: z.string().min(1),
      placementSectionId: z.string().min(1),
    }),
  ),
  reviewPlan: reviewPlanSchema,
  externalEnrichment: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      decision: z.enum(["include", "exclude", "optional", "needs-separate-source"]),
      placement: z.string().optional(),
      provenance: provenanceClassSchema,
      note: z.string().min(1),
    }),
  ),
  coverageRequirements: z.array(
    z.object({
      id: z.string().min(1),
      topicId: z.string().min(1),
      requirement: z.string().min(1),
      assignedSectionId: z.string().min(1),
    }),
  ),
  writerConstraints: z.array(z.string().min(1)).min(1),
  qualityChecks: z.object({
    allCoreTopicsAssigned: z.boolean(),
    allMustGuardsRepresented: z.boolean(),
    preventsCheatSheetCompression: z.boolean(),
    noFinalProseInArtifact: z.boolean(),
  }),
});

export type Composition = z.infer<typeof compositionSchema>;

export function parseComposition(data: unknown): Composition {
  return compositionSchema.parse(data);
}

export function validateCompositionIntegrity(c: Composition): string[] {
  const errors: string[] = [];
  const sectionIds = c.sections.map((s) => s.id);
  if (new Set(sectionIds).size !== sectionIds.length) errors.push("duplicate section ids");

  const seqIds = c.sections.flatMap((s) => s.sequence.map((x) => x.id));
  if (new Set(seqIds).size !== seqIds.length) errors.push("duplicate sequence ids");

  const sectionIdSet = new Set(sectionIds);
  for (const conn of c.crossTopicConnections) {
    if (!sectionIdSet.has(conn.placementSectionId)) {
      errors.push(`connection ${conn.id} unknown section ${conn.placementSectionId}`);
    }
  }
  for (const req of c.coverageRequirements) {
    if (!sectionIdSet.has(req.assignedSectionId)) {
      errors.push(`coverage ${req.id} unknown section ${req.assignedSectionId}`);
    }
  }

  const conceptIds = new Set(
    c.sections.flatMap((s) => [
      ...s.requiredConcepts.map((u) => u.conceptId),
      ...s.sequence.flatMap((x) => x.conceptIds),
      s.entryConcept,
    ]),
  );
  for (const conn of c.crossTopicConnections) {
    if (!conceptIds.has(conn.fromConceptId)) {
      errors.push(`connection ${conn.id} from ${conn.fromConceptId} not in composition`);
    }
    if (!conceptIds.has(conn.toConceptId)) {
      errors.push(`connection ${conn.id} to ${conn.toConceptId} not in composition`);
    }
  }

  for (const s of c.sections) {
    if (!conceptIds.has(s.entryConcept) && !s.requiredConcepts.some((u) => u.conceptId === s.entryConcept)) {
      // entry may equal first required concept
      if (!s.requiredConcepts.some((u) => u.conceptId === s.entryConcept)) {
        errors.push(`section ${s.id} entryConcept ${s.entryConcept} missing from requiredConcepts`);
      }
    }
    for (const u of s.requiredConcepts) {
      if (u.provenance === "EXTERNAL_ENRICHMENT" && u.sourceRefs.length === 0) {
        // allowed if listed in externalEnrichment
      }
      if (u.provenance === "SOURCE_CORE" && u.sourceRefs.length === 0) {
        errors.push(`SOURCE_CORE unit ${u.conceptId} lacks sourceRefs`);
      }
    }
    if (s.coverage.mustPreserve.length === 0) {
      errors.push(`section ${s.id} empty mustPreserve`);
    }
  }

  for (const e of c.externalEnrichment) {
    if (e.decision === "include" && e.provenance !== "EXTERNAL_ENRICHMENT" && e.provenance !== "SOURCE_CONTEXT") {
      errors.push(`external item ${e.id} include with non-enrichment provenance`);
    }
  }

  if (!c.qualityChecks.allCoreTopicsAssigned) errors.push("core topics not all assigned");
  if (!c.qualityChecks.allMustGuardsRepresented) errors.push("must-guards not represented");
  if (!c.qualityChecks.preventsCheatSheetCompression) errors.push("compression protection flag false");

  return errors;
}
