/**
 * lib/cgp/review-schemas.ts — CGP-4A chapter content review schema.
 */

import { z } from "zod";

export const CGP_CHAPTER_REVIEW_SCHEMA = "cgp.chapter-review.v1" as const;

const classificationSchema = z.enum([
  "CONFIRMED_ERROR",
  "OVERSTATEMENT",
  "OVERSIMPLIFICATION",
  "UNSUPPORTED",
  "SOURCE_MISREPRESENTATION",
  "TERMINOLOGY_PROBLEM",
  "PEDAGOGICAL_WEAKNESS",
  "REDUNDANCY",
  "SCOPE_PROBLEM",
  "GOOD",
]);

const severitySchema = z.enum(["critical", "high", "medium", "low"]);
const readinessSchema = z.enum(["READY_TO_PROMOTE", "READY_WITH_REVISIONS", "NOT_READY"]);
const gateSchema = z.enum(["PASS", "FAIL", "PARTIAL"]);

export const reviewIssueSchema = z.object({
  id: z.string().regex(/^review-\d{3}$/),
  severity: severitySchema,
  classification: classificationSchema,
  sectionId: z.string().min(1),
  location: z.string().min(1),
  claim: z.string().min(1),
  evidence: z
    .array(
      z.object({
        sourceId: z.string().min(1),
        pages: z.array(z.number().int().positive()).default([]),
        note: z.string().optional(),
      }),
    )
    .default([]),
  impact: z.string().min(1),
  recommendation: z.string().min(1),
});

export const topicReviewSchema = z.object({
  topicId: z.string().min(1),
  coverage: gateSchema,
  accuracy: gateSchema,
  depth: gateSchema,
  sourceFidelity: gateSchema,
  pedagogy: gateSchema,
  notes: z.string().min(1),
});

export const mustPreserveReviewSchema = z.object({
  id: z.string().min(1),
  status: gateSchema,
  present: z.boolean(),
  accurate: z.boolean(),
  adequatelyExplained: z.boolean(),
  sourceBacked: z.boolean(),
  evidence: z.string().min(1),
});

export const chapterReviewSchema = z.object({
  schemaVersion: z.literal(CGP_CHAPTER_REVIEW_SCHEMA),
  generatedAt: z.string().min(1),
  metadata: z.object({
    chapterPath: z.string().min(1),
    planPath: z.string().min(1),
    sourcePath: z.string().min(1),
    reviewType: z.literal("audit-only"),
  }),
  chapterStats: z.object({
    sections: z.number().int().nonnegative(),
    headings: z.number().int().nonnegative(),
    paragraphs: z.number().int().nonnegative(),
    lists: z.number().int().nonnegative(),
    listItems: z.number().int().nonnegative(),
    tables: z.number().int().nonnegative(),
    callouts: z.number().int().nonnegative(),
    formulas: z.object({
      display: z.number().int().nonnegative(),
      inline: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    }),
    examples: z.number().int().nonnegative(),
    reviewQuestions: z.number().int().nonnegative(),
    sourceComments: z.number().int().nonnegative(),
    chars: z.number().int().nonnegative(),
  }),
  topicReviews: z.array(topicReviewSchema).min(10),
  mustPreserveReviews: z.array(mustPreserveReviewSchema).length(10),
  factIssues: z.array(reviewIssueSchema).default([]),
  sourceIssues: z.array(reviewIssueSchema).default([]),
  terminologyIssues: z.array(reviewIssueSchema).default([]),
  pedagogyIssues: z.array(reviewIssueSchema).default([]),
  redundancyIssues: z.array(reviewIssueSchema).default([]),
  scopeIssues: z.array(reviewIssueSchema).default([]),
  formulaIssues: z.array(reviewIssueSchema).default([]),
  exampleIssues: z.array(reviewIssueSchema).default([]),
  questionIssues: z.array(reviewIssueSchema).default([]),
  languageIssues: z.array(reviewIssueSchema).default([]),
  positivePreservationList: z.array(
    z.object({
      id: z.string().min(1),
      sectionId: z.string().min(1),
      what: z.string().min(1),
      why: z.string().min(1),
    }),
  ),
  overallReadiness: z.object({
    level: readinessSchema,
    criticalCount: z.number().int().nonnegative(),
    highCount: z.number().int().nonnegative(),
    mediumCount: z.number().int().nonnegative(),
    lowCount: z.number().int().nonnegative(),
    compressionRegression: z.boolean(),
    rationale: z.string().min(1),
  }),
});

export type ChapterReview = z.infer<typeof chapterReviewSchema>;

export function parseChapterReview(data: unknown): ChapterReview {
  return chapterReviewSchema.parse(data);
}

export function validateChapterReviewIntegrity(r: ChapterReview): string[] {
  const errors: string[] = [];
  const all = [
    ...r.factIssues,
    ...r.sourceIssues,
    ...r.terminologyIssues,
    ...r.pedagogyIssues,
    ...r.redundancyIssues,
    ...r.scopeIssues,
    ...r.formulaIssues,
    ...r.exampleIssues,
    ...r.questionIssues,
    ...r.languageIssues,
  ];
  const ids = all.map((i) => i.id);
  if (new Set(ids).size !== ids.length) errors.push("duplicate issue ids");

  const crit = all.filter((i) => i.severity === "critical").length;
  const high = all.filter((i) => i.severity === "high").length;
  const med = all.filter((i) => i.severity === "medium").length;
  const low = all.filter((i) => i.severity === "low").length;
  if (r.overallReadiness.criticalCount !== crit) errors.push("criticalCount mismatch");
  if (r.overallReadiness.highCount !== high) errors.push("highCount mismatch");
  if (r.overallReadiness.mediumCount !== med) errors.push("mediumCount mismatch");
  if (r.overallReadiness.lowCount !== low) errors.push("lowCount mismatch");

  if (crit > 0 && r.overallReadiness.level !== "NOT_READY") {
    errors.push("critical issues require NOT_READY");
  }
  if (crit === 0 && high === 0 && r.overallReadiness.level === "NOT_READY") {
    errors.push("NOT_READY without critical/high");
  }

  for (const g of r.mustPreserveReviews) {
    if (g.status === "FAIL") errors.push(`must-preserve FAIL: ${g.id}`);
  }
  if (r.overallReadiness.compressionRegression) errors.push("compression regression flagged");

  return errors;
}
