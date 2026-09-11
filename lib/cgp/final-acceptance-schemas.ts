/**
 * lib/cgp/final-acceptance-schemas.ts — CGP-4C final acceptance schema.
 */

import { z } from "zod";

export const CGP_FINAL_ACCEPTANCE_SCHEMA = "cgp.final-acceptance.v1" as const;

const verdictSchema = z.enum(["ACCEPT", "REVISE", "REJECT"]);
const statusSchema = z.enum(["PASS", "PARTIAL", "FAIL", "REVIEW"]);
const severitySchema = z.enum(["critical", "high", "medium", "low", "info"]);

export const acceptanceIssueSchema = z.object({
  id: z.string().regex(/^acc-\d{3}$/),
  severity: severitySchema,
  classification: z.string().min(1),
  sectionId: z.string().min(1),
  location: z.string().min(1),
  claim: z.string().min(1),
  evidence: z.array(z.string()).default([]),
  recommendation: z.string().min(1),
});

export const topicResultSchema = z.object({
  topicId: z.string().min(1),
  accuracy: statusSchema,
  sourceFidelity: statusSchema,
  depth: statusSchema,
  pedagogy: statusSchema,
  terminology: statusSchema,
  status: statusSchema,
  notes: z.string().min(1),
});

export const mustPreserveResultSchema = z.object({
  id: z.string().min(1),
  status: statusSchema,
  sectionId: z.string().min(1),
  evidence: z.string().min(1),
});

export const finalAcceptanceSchema = z.object({
  schemaVersion: z.literal(CGP_FINAL_ACCEPTANCE_SCHEMA),
  generatedAt: z.string().min(1),
  metadata: z.object({
    chapterPath: z.string().min(1),
    priorReview: z.string().min(1),
    revisionPhase: z.literal("CGP-4B"),
    auditType: z.literal("final-acceptance"),
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
  topicResults: z.array(topicResultSchema).min(10),
  mustPreserveResults: z.array(mustPreserveResultSchema).length(10),
  factualIssues: z.array(acceptanceIssueSchema).default([]),
  sourceIssues: z.array(acceptanceIssueSchema).default([]),
  terminologyIssues: z.array(acceptanceIssueSchema).default([]),
  pedagogyIssues: z.array(acceptanceIssueSchema).default([]),
  redundancyIssues: z.array(acceptanceIssueSchema).default([]),
  scopeIssues: z.array(acceptanceIssueSchema).default([]),
  questionResults: z.object({
    total: z.number().int().nonnegative(),
    answerableFromChapter: z.number().int().nonnegative(),
    needExternalKnowledge: z.number().int().nonnegative(),
    notes: z.string().min(1),
  }),
  provenanceResults: z.object({
    commentCount: z.number().int().nonnegative(),
    document: z.string().min(1),
    invalidPages: z.number().int().nonnegative(),
    unavailableSourcesClaimed: z.number().int().nonnegative(),
    scopeJudgment: z.string().min(1),
  }),
  externalContentResults: z.object({
    shannonPresent: z.boolean(),
    snrPresent: z.boolean(),
    transmissionTimePresent: z.boolean(),
    ipconfigPresent: z.boolean(),
    mbMbPresent: z.boolean(),
    bandwidthStandalonePresent: z.boolean(),
    judgment: z.string().min(1),
  }),
  positiveFindings: z.array(
    z.object({
      id: z.string().min(1),
      what: z.string().min(1),
      why: z.string().min(1),
    }),
  ),
  criticalFindings: z.array(acceptanceIssueSchema).default([]),
  highFindings: z.array(acceptanceIssueSchema).default([]),
  mediumFindings: z.array(acceptanceIssueSchema).default([]),
  lowFindings: z.array(acceptanceIssueSchema).default([]),
  overallVerdict: verdictSchema,
  promotionReady: z.boolean(),
  chapterClass: z.enum(["CHEAT_SHEET", "STUDY_CHAPTER", "TEXTBOOK_LIKE"]),
  rationale: z.string().min(1),
});

export type FinalAcceptance = z.infer<typeof finalAcceptanceSchema>;

export function parseFinalAcceptance(data: unknown): FinalAcceptance {
  return finalAcceptanceSchema.parse(data);
}

export function validateFinalAcceptanceIntegrity(a: FinalAcceptance): string[] {
  const errors: string[] = [];
  const all = [
    ...a.factualIssues,
    ...a.sourceIssues,
    ...a.terminologyIssues,
    ...a.pedagogyIssues,
    ...a.redundancyIssues,
    ...a.scopeIssues,
    ...a.criticalFindings,
    ...a.highFindings,
    ...a.mediumFindings,
    ...a.lowFindings,
  ];
  const ids = all.map((i) => i.id);
  if (new Set(ids).size !== ids.length) errors.push("duplicate issue ids");

  for (const g of a.mustPreserveResults) {
    if (g.status === "FAIL") errors.push(`must-preserve FAIL ${g.id}`);
  }
  if (a.overallVerdict === "ACCEPT" && a.promotionReady !== true) {
    errors.push("ACCEPT requires promotionReady");
  }
  if (a.overallVerdict !== "ACCEPT" && a.promotionReady !== false) {
    errors.push("non-ACCEPT requires promotionReady=false");
  }
  if (a.overallVerdict === "REJECT" && a.criticalFindings.length === 0 && a.highFindings.length === 0) {
    errors.push("REJECT without critical/high findings");
  }
  if (a.chapterClass !== "STUDY_CHAPTER") {
    errors.push("chapterClass should be STUDY_CHAPTER for this pipeline target");
  }
  return errors;
}
