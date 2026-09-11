/**
 * lib/cgp/validation-schemas.ts — CGP-2 validation artifact schema.
 */

import { z } from "zod";

export const CGP_VALIDATION_SCHEMA = "cgp.validation.v1" as const;

const severitySchema = z.enum(["critical", "high", "medium", "low"]);
const issueStatusSchema = z.enum([
  "verified",
  "verified-with-qualifier",
  "needs-review",
  "contradicted",
  "unsupported",
  "external-context",
]);
const readinessSchema = z.enum(["READY", "READY_WITH_REVIEW", "BLOCKED"]);
const blockStatusSchema = z.enum(["FULL", "PARTIAL", "MISSING"]);

export const validationIssueSchema = z.object({
  id: z.string().regex(/^issue-\d{3}$/),
  severity: severitySchema,
  category: z.string().min(1),
  entityId: z.string().min(1),
  status: issueStatusSchema,
  claim: z.string().min(1),
  evidence: z.array(z.string()).default([]),
  recommendation: z.string().min(1),
});

export const validationArtifactSchema = z.object({
  schemaVersion: z.literal(CGP_VALIDATION_SCHEMA),
  generatedAt: z.string().min(1),
  validates: z.object({
    topicMap: z.string().min(1),
    deepTopics: z.string().min(1),
    source: z.object({
      id: z.string().min(1),
      pageCount: z.number().int().positive(),
      path: z.string().min(1),
    }),
  }),
  sources: z.object({
    available: z.array(
      z.object({
        id: z.string().min(1),
        document: z.string().min(1),
        pageCount: z.number().int().positive().optional(),
        role: z.string().optional(),
        verifiedPages: z.number().int().nonnegative().optional(),
      }),
    ),
    unavailable: z.array(
      z.object({
        id: z.string().min(1),
        document: z.string().min(1),
      }),
    ),
    provenanceChecks: z.object({
      evidenceAnchorsChecked: z.number().int().nonnegative(),
      evidenceAnchorsHit: z.number().int().nonnegative(),
      evidenceAnchorsWeak: z.number().int().nonnegative(),
      badPages: z.number().int().nonnegative(),
    }),
  }),
  sourceCoverage: z.object({
    method: z.string().min(1),
    blocks: z.array(
      z.object({
        id: z.string().min(1),
        pages: z.array(z.number().int().positive()),
        topics: z.array(z.string()),
        status: blockStatusSchema,
        note: z.string().min(1),
      }),
    ),
    summary: z.object({
      full: z.number().int().nonnegative(),
      partial: z.number().int().nonnegative(),
      missing: z.number().int().nonnegative(),
    }),
  }),
  conceptValidation: z.object({
    total: z.number().int().nonnegative(),
    verified: z.number().int().nonnegative(),
    verifiedWithQualifier: z.number().int().nonnegative(),
    needsReview: z.number().int().nonnegative(),
    unsupported: z.number().int().nonnegative(),
    contradicted: z.number().int().nonnegative(),
  }),
  definitionValidation: z.object({
    total: z.number().int().nonnegative(),
    verified: z.number().int().nonnegative(),
    needsQualifier: z.number().int().nonnegative(),
    inconsistent: z.number().int().nonnegative(),
    unsupported: z.number().int().nonnegative(),
    notes: z.array(z.string()).default([]),
  }),
  relationshipValidation: z.object({
    total: z.number().int().nonnegative(),
    valid: z.number().int().nonnegative(),
    danglingConceptualPlaceholders: z.number().int().nonnegative(),
    realDangling: z.number().int().nonnegative(),
    unsupported: z.number().int().nonnegative(),
    contradictory: z.number().int().nonnegative(),
    notes: z.array(z.string()).default([]),
  }),
  formulaValidation: z.object({
    sourceBacked: z.array(
      z.object({
        id: z.string().min(1),
        latex: z.string().min(1),
        status: z.string().min(1),
        conditions: z.array(z.string()),
        sourcePages: z.array(z.number().int().positive()),
        notes: z.string().min(1),
      }),
    ),
    externalUnverified: z.array(
      z.object({
        id: z.string().min(1),
        status: z.string().min(1),
      }),
    ),
    recalculation: z.array(
      z.object({
        id: z.string().min(1),
        n: z.number().optional(),
        bits: z.number().optional(),
        expected: z.number(),
        got: z.number(),
        ok: z.boolean(),
      }),
    ),
  }),
  exampleValidation: z.object({
    total: z.number().int().nonnegative(),
    sourceBacked: z.number().int().nonnegative(),
    recalculated: z.array(
      z.object({
        id: z.string().min(1),
        arithmetic: z.string().min(1),
        result: z.enum(["NO_ERROR", "SOURCE_ERROR", "CGP_ERROR"]),
      }),
    ),
    issues: z.array(z.string()).default([]),
  }),
  comparisonValidation: z.object({
    total: z.number().int().nonnegative(),
    valid: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
    notes: z.array(z.string()).default([]),
  }),
  confusionValidation: z.object({
    total: z.number().int().nonnegative(),
    explicit: z.number().int().nonnegative(),
    implied: z.number().int().nonnegative(),
    notInSource: z.number().int().nonnegative(),
    notes: z.array(z.string()).default([]),
  }),
  objectiveValidation: z.object({
    total: z.number().int().nonnegative(),
    specific: z.number().int().nonnegative(),
    tooVague: z.number().int().nonnegative(),
    unsupported: z.number().int().nonnegative(),
  }),
  terminology: z.object({
    table: z.array(
      z.object({
        term: z.string().min(1),
        status: z.string().min(1),
        note: z.string().min(1),
      }),
    ),
    internetVsInternetwork: z.object({
      status: z.string().min(1),
      note: z.string().min(1),
    }),
  }),
  provenanceValidation: z.object({
    checked: z.number().int().nonnegative(),
    hit: z.number().int().nonnegative(),
    weak: z.array(
      z.object({
        entityId: z.string(),
        evidence: z.string(),
        pages: z.array(z.number()),
      }),
    ),
    badPage: z.array(z.object({ entityId: z.string(), page: z.number() })),
  }),
  externalContext: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      validation: z.string().min(1),
      decision: z.string().min(1),
      disposition: z.string().min(1),
      note: z.string().min(1),
    }),
  ),
  scopeFlags: z.array(
    z.object({
      id: z.string().min(1),
      severity: z.string().min(1),
      message: z.string().min(1),
      relatedTopicIds: z.array(z.string()).default([]),
    }),
  ),
  compressionAudit: z.object({
    method: z.string().min(1),
    categories: z.object({
      "PRESENT+ADEQUATE": z.array(z.string()),
      "PRESENT+TOO_SHALLOW": z.array(z.string()),
      "PRESENT+WRONG_EMPHASIS": z.array(z.string()),
      MISSING: z.array(z.string()),
      "EXTERNAL/UNVERIFIED": z.array(z.string()),
    }),
  }),
  compressionGuardChecks: z.array(
    z.object({
      id: z.string().min(1),
      represented: z.boolean(),
      description: z.string().min(1),
    }),
  ),
  readiness: z.object({
    level: readinessSchema,
    cgp3CanComposeWithoutRediscoveringSource: z.boolean(),
    residualReviewAllowed: z.boolean(),
  }),
  issues: z.array(validationIssueSchema),
  qualityChecks: z.object({
    noUnresolvedCriticalKnowledgeContradictions: z.boolean(),
    coreTopicsCoveredInKnowledgeBase: z.boolean(),
    unsupportedMarked: z.boolean(),
    formulasValidated: z.boolean(),
  }),
});

export type ValidationArtifact = z.infer<typeof validationArtifactSchema>;

export function parseValidationArtifact(data: unknown): ValidationArtifact {
  return validationArtifactSchema.parse(data);
}

export function validateValidationIntegrity(v: ValidationArtifact): string[] {
  const errors: string[] = [];
  const ids = v.issues.map((i) => i.id);
  if (new Set(ids).size !== ids.length) errors.push("duplicate issue ids");

  const pageMax = v.validates.source.pageCount;
  for (const r of v.formulaValidation.recalculation) {
    if (!r.ok) errors.push(`formula recalculation failed for ${r.id}`);
  }
  for (const f of v.formulaValidation.sourceBacked) {
    for (const p of f.sourcePages) {
      if (p < 1 || p > pageMax) errors.push(`formula ${f.id} bad page ${p}`);
    }
  }
  if (v.sources.provenanceChecks.badPages > 0) errors.push("bad source pages remain");
  if (v.sources.provenanceChecks.evidenceAnchorsWeak > 0) {
    // weak is allowed but recorded
  }
  if (v.qualityChecks.formulasValidated !== true) errors.push("formulas not validated");
  if (v.readiness.level === "BLOCKED") errors.push("readiness BLOCKED");
  for (const g of v.compressionGuardChecks) {
    if (!g.represented) errors.push(`compression guard not represented: ${g.id}`);
  }
  return errors;
}
