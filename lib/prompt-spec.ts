/**
 * lib/prompt-spec.ts
 * PS.1 — PromptSpec: a versioned specification, not a free-text blob.
 *
 * Washi still does not call an LLM. renderPrompt() produces the string you
 * copy to ChatGPT/Claude/Gemini. Validation is deterministic (Zod).
 */

import { z } from "zod";
import type { Prompt, PromptCategory } from "./prompts";

/** A typed input slot filled at render time. */
export const promptVariableSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "اسم المتغير: a-z, A-Z, 0-9, _"),
  description: z.string().min(1).optional(),
  required: z.boolean().default(true),
  example: z.string().optional(),
});
export type PromptVariable = z.infer<typeof promptVariableSchema>;

/** Hard requirements the model output must satisfy (paired with Washi validators). */
export const outputContractSchema = z.object({
  format: z.enum(["markdown", "json"]).default("markdown"),
  must: z.array(z.string().min(1)).default([]),
  mustNot: z.array(z.string().min(1)).default([]),
});
export type OutputContract = z.infer<typeof outputContractSchema>;

export const promptExampleSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["positive", "negative"]).default("positive"),
  title: z.string().min(1).optional(),
  input: z.string().default(""),
  output: z.string().min(1),
  note: z.string().optional(),
});
export type PromptExample = z.infer<typeof promptExampleSchema>;

export const promptTaskTypeSchema = z.enum([
  "manuscript-generation",
  "section-planning",
  "concept-extraction",
  "definition-generation",
  "question-generation",
  "flashcard-generation",
  "provenance-review",
  "markdown-repair",
  "quality-review",
  "revision",
  "rules",
]);

export const promptSpecSchema = z.object({
  schema: z.literal("washi.prompt-spec/0.1"),
  id: z.number().int().positive(),
  version: z.number().int().positive(),
  title: z.string().min(1),
  /** Scope (legacy category) — global/subject/chapter/formatting. */
  category: z.enum(["global", "subject", "chapter", "formatting"]),
  taskType: promptTaskTypeSchema.default("rules"),
  subject: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).default([]),
  instruction: z.string().min(1),
  variables: z.array(promptVariableSchema).default([]),
  constraints: z.array(z.string().min(1)).default([]),
  output: outputContractSchema.default({ format: "markdown", must: [], mustNot: [] }),
  examples: z.array(promptExampleSchema).default([]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type PromptSpec = z.infer<typeof promptSpecSchema>;

export const PROMPT_TASK_TYPES = [
  { id: "manuscript-generation", label: "توليد مخطوط" },
  { id: "section-planning", label: "تخطيط الأقسام" },
  { id: "concept-extraction", label: "استخراج المفاهيم" },
  { id: "definition-generation", label: "توليد التعريفات" },
  { id: "question-generation", label: "توليد الأسئلة" },
  { id: "flashcard-generation", label: "توليد البطاقات" },
  { id: "provenance-review", label: "مراجعة المصادر" },
  { id: "markdown-repair", label: "إصلاح Markdown" },
  { id: "quality-review", label: "مراجعة الجودة" },
  { id: "revision", label: "تنقيح" },
  { id: "rules", label: "قواعد / تعليمات" },
] as const;

/** Migrate a legacy Prompt body into a minimal PromptSpec. */
export function promptToSpec(prompt: Prompt, opts: { taskType?: PromptSpec["taskType"] } = {}): PromptSpec {
  const version = Math.max(1, prompt.versions.length);
  return promptSpecSchema.parse({
    schema: "washi.prompt-spec/0.1",
    id: prompt.id,
    version,
    title: prompt.title,
    category: prompt.category,
    taskType: opts.taskType ?? "rules",
    subject: prompt.subject,
    tags: prompt.tags ?? [],
    instruction: prompt.body,
    variables: [],
    constraints: [],
    output: {
      format: "markdown",
      must: [
        "frontmatter صالح (subject, title, language, sources)",
        "عناوين H2 للأقسام",
        " provenance لكل قسم: <!-- source: ... -->",
        "LaTeX متوازن داخل $$",
      ],
      mustNot: [
        "اختراع أرقام صفحات غير موجودة في المصدر",
        "محتوى مولّد بلا <!-- source: (generated) -->",
      ],
    },
    examples: [],
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
  });
}

/** Flatten spec + filled variables into the copy-to-AI string. */
export function renderPrompt(
  spec: PromptSpec,
  inputs: Record<string, string> = {}
): string {
  const missing = spec.variables.filter((v) => v.required && !(inputs[v.name] ?? "").trim());
  if (missing.length) {
    throw new Error(
      `متغيرات مطلوبة ناقصة: ${missing.map((v) => v.name).join("، ")}`
    );
  }

  const parts: string[] = [];
  parts.push(`# ${spec.title}`);
  if (spec.subject) parts.push(`المادة: ${spec.subject}`);
  parts.push(`المهمة: ${spec.taskType}`);
  parts.push("");
  parts.push(spec.instruction.trim());

  if (spec.variables.length) {
    parts.push("");
    parts.push("## المدخلات");
    for (const v of spec.variables) {
      const val = inputs[v.name] ?? v.example ?? "";
      parts.push(`### ${v.name}${v.description ? ` — ${v.description}` : ""}`);
      parts.push(val.trim() || "(فارغ)");
      parts.push("");
    }
  }

  if (spec.constraints.length) {
    parts.push("## القيود");
    for (const c of spec.constraints) parts.push(`- ${c}`);
    parts.push("");
  }

  const must = spec.output.must ?? [];
  const mustNot = spec.output.mustNot ?? [];
  if (must.length || mustNot.length || spec.output.format !== "markdown") {
    parts.push("## عقد الخرج (OUTPUT CONTRACT)");
    parts.push(`الصيغة: ${spec.output.format}`);
    if (must.length) {
      parts.push("يجب:");
      for (const m of must) parts.push(`- ${m}`);
    }
    if (mustNot.length) {
      parts.push("يجب ألا:");
      for (const m of mustNot) parts.push(`- ${m}`);
    }
    parts.push("");
  }

  if (spec.examples.length) {
    parts.push("## أمثلة");
    for (const ex of spec.examples) {
      parts.push(`### ${ex.kind === "negative" ? "❌" : "✅"} ${ex.title ?? ex.id}`);
      if (ex.input) {
        parts.push("**المدخل:**");
        parts.push(ex.input);
      }
      parts.push("**الخرج:**");
      parts.push(ex.output);
      if (ex.note) parts.push(`ملاحظة: ${ex.note}`);
      parts.push("");
    }
  }

  if (spec.tags.length) {
    parts.push(`tags: ${spec.tags.join(", ")}`);
  }

  return parts.join("\n").trim() + "\n";
}

/** Deterministic validation of a rendered output against the contract (structure-level). */
export function checkOutputContract(
  spec: PromptSpec,
  output: string
): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  if (spec.output.format === "json") {
    try {
      JSON.parse(output);
    } catch {
      failures.push("الخرج المطلوب JSON لكنه غير قابل للتحليل");
    }
  }
  if (spec.output.format === "markdown") {
    if (!/^---\s*\n[\s\S]*?\n---/.test(output)) {
      failures.push("لا يوجد frontmatter YAML");
    }
  }
  return { ok: failures.length === 0, failures };
}

/** Seed examples that pin Washi's content contract (PS.1.4). */
export const WASHI_CONTRACT_EXAMPLES: PromptExample[] = [
  {
    id: "good-provenance-01",
    kind: "positive",
    title: "مصدر صحيح",
    input: "",
    output: [
      "<!-- source: Computer Networks.pdf p.42 -->",
      "",
      "## Shannon Capacity",
      "",
      "نص مدعوم من الصفحة 42…",
    ].join("\n"),
    note: "الصفحة موجودة فعلاً في قائمة sources بالـfrontmatter",
  },
  {
    id: "bad-hallucinated-page-01",
    kind: "negative",
    title: "صفحة مخترعة",
    input: "",
    output: [
      "## Shannon Capacity",
      "",
      "حسب الصفحة 51…",
    ].join("\n"),
    note: "لا يوجد source comment، والصفحة غير معلنة في frontmatter",
  },
  {
    id: "good-generated-marker-01",
    kind: "positive",
    title: "محتوى مولّد معلّم",
    input: "",
    output: [
      "<!-- source: (generated) -->",
      "",
      "## أسئلة مراجعة",
      "",
      "1. …",
    ].join("\n"),
  },
  {
    id: "bad-definition-plain-01",
    kind: "negative",
    title: "تعريف بلا callout",
    input: "",
    output: "Bandwidth is basically…",
    note: "يجب أن يكون > [!NOTE] **المصطلح:** …",
  },
];

export function emptySpecFromPrompt(prompt: Prompt): PromptSpec {
  return promptToSpec(prompt);
}

export type { PromptCategory };
