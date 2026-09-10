/**
 * lib/prompts.ts
 * Washi 0.5 Prompt Library — Washi does not generate content. It stores,
 * versions, and hands off prompts to external AI tools; Markdown returns
 * to Washi as content.md.
 *
 * PS.0 hardening: Zod-validated store, atomic writes, tags, search,
 * import/export. PromptSpec (task/variables/contract) is PS.1 — not here.
 */

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const PROMPTS_FILE =
  process.env.WASHI_PROMPTS_FILE ?? path.join(process.cwd(), ".washi", "prompts.json");

export type PromptCategory = "global" | "subject" | "chapter" | "formatting";

export const PROMPT_CATEGORIES: Array<{ id: PromptCategory; label: string; hint: string }> = [
  { id: "global", label: "قواعد عامة", hint: "Global Rules — تُلحق بكل prompt" },
  { id: "subject", label: "قواعد المادة", hint: "Subject Rules — لكل مادة دراسية" },
  { id: "chapter", label: "قواعد الفصل", hint: "Chapter Rules — هيكلة الفصل الواحد" },
  { id: "formatting", label: "قواعد التنسيق", hint: "Formatting Rules — صيغة Markdown المستهدفة" },
];

export const promptCategorySchema = z.enum([
  "global",
  "subject",
  "chapter",
  "formatting",
]);

export const promptVersionSchema = z.object({
  body: z.string().min(1),
  at: z.string().min(1),
  note: z.string().optional(),
});

export const promptSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  category: promptCategorySchema,
  subject: z.string().min(1).optional(),
  body: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  versions: z.array(promptVersionSchema).min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const promptStoreSchema = z.object({
  nextId: z.number().int().positive(),
  prompts: z.array(promptSchema),
});

export type PromptVersion = z.infer<typeof promptVersionSchema>;
export type Prompt = z.infer<typeof promptSchema>;

interface PromptStore {
  nextId: number;
  prompts: Prompt[];
}

/** Normalizes a raw/partial prompt into a valid Prompt or null. */
function coercePrompt(raw: unknown): Prompt | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const body = typeof o.body === "string" && o.body.length > 0 ? o.body : null;
  const title = typeof o.title === "string" && o.title.length > 0 ? o.title : null;
  const id = typeof o.id === "number" && Number.isInteger(o.id) && o.id > 0 ? o.id : null;
  if (!body || !title || !id) return null;

  const category =
    o.category === "global" ||
    o.category === "subject" ||
    o.category === "chapter" ||
    o.category === "formatting"
      ? o.category
      : "formatting";

  const tags = Array.isArray(o.tags)
    ? o.tags.filter((t): t is string => typeof t === "string" && t.length > 0)
    : [];

  const versionsRaw = Array.isArray(o.versions) ? o.versions : [];
  const versions: PromptVersion[] = [];
  for (const v of versionsRaw) {
    if (!v || typeof v !== "object") continue;
    const vv = v as Record<string, unknown>;
    if (typeof vv.body === "string" && vv.body.length > 0) {
      versions.push({
        body: vv.body,
        at: typeof vv.at === "string" ? vv.at : new Date(0).toISOString(),
        note: typeof vv.note === "string" ? vv.note : undefined,
      });
    }
  }
  if (versions.length === 0) {
    versions.push({ body, at: typeof o.createdAt === "string" ? o.createdAt : new Date(0).toISOString(), note: "ترميم" });
  }

  return {
    id,
    title,
    category,
    subject: typeof o.subject === "string" && o.subject.length > 0 ? o.subject : undefined,
    body,
    tags,
    versions,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date(0).toISOString(),
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date(0).toISOString(),
  };
}

function loadStore(): PromptStore {
  try {
    const raw = JSON.parse(fs.readFileSync(PROMPTS_FILE, "utf8")) as unknown;
    if (!raw || typeof raw !== "object") return { nextId: 1, prompts: [] };
    const o = raw as Record<string, unknown>;
    const rawPrompts = Array.isArray(o.prompts) ? o.prompts : [];
    const prompts: Prompt[] = [];
    for (const p of rawPrompts) {
      const c = coercePrompt(p);
      if (c) prompts.push(c);
    }
    let nextId = typeof o.nextId === "number" && o.nextId > 0 ? o.nextId : 1;
    for (const p of prompts) {
      if (p.id >= nextId) nextId = p.id + 1;
    }
    return { nextId, prompts };
  } catch {
    return { nextId: 1, prompts: [] };
  }
}

/** Atomic write: temp file in the same directory, then rename. */
function saveStore(store: PromptStore) {
  const dir = path.dirname(PROMPTS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const parsed = promptStoreSchema.safeParse(store);
  if (!parsed.success) {
    throw new Error(
      `prompts store invalid: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`
    );
  }
  const tmp = `${PROMPTS_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(parsed.data, null, 2), "utf8");
  fs.renameSync(tmp, PROMPTS_FILE);
}

export function listPrompts(): Prompt[] {
  return loadStore().prompts;
}

export function getPrompt(id: number): Prompt | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  return loadStore().prompts.find((p) => p.id === id) ?? null;
}

export interface PromptInput {
  title: string;
  category: PromptCategory;
  subject?: string;
  body: string;
  tags?: string[];
}

export const promptInputSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  category: promptCategorySchema,
  subject: z.string().min(1).optional(),
  body: z.string().min(1, "نص الـprompt مطلوب"),
  tags: z.array(z.string().min(1)).optional(),
});

function assertValidInput(input: PromptInput): void {
  const r = promptInputSchema.safeParse(input);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`بيانات prompt غير صالحة — ${msg}`);
  }
}

export function createPrompt(input: PromptInput): Prompt {
  assertValidInput(input);
  const store = loadStore();
  const now = new Date().toISOString();
  const prompt: Prompt = {
    id: store.nextId++,
    title: input.title.trim(),
    category: input.category,
    subject: input.subject?.trim() || undefined,
    body: input.body,
    tags: input.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
    versions: [{ body: input.body, at: now, note: "الإنشاء" }],
    createdAt: now,
    updatedAt: now,
  };
  store.prompts.push(prompt);
  saveStore(store);
  return prompt;
}

export function updatePrompt(id: number, input: Partial<PromptInput>): Prompt | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  if (input.title !== undefined || input.body !== undefined || input.category !== undefined) {
    const storePeek = loadStore();
    const existing = storePeek.prompts.find((p) => p.id === id);
    if (!existing) return null;
    assertValidInput({
      title: input.title ?? existing.title,
      category: input.category ?? existing.category,
      subject: input.subject !== undefined ? input.subject : existing.subject,
      body: input.body ?? existing.body,
      tags: input.tags ?? existing.tags,
    });
  }
  const store = loadStore();
  const prompt = store.prompts.find((p) => p.id === id);
  if (!prompt) return null;
  const now = new Date().toISOString();
  if (typeof input.title === "string") prompt.title = input.title.trim();
  if (typeof input.category === "string") prompt.category = input.category;
  if (input.subject !== undefined) {
    prompt.subject = input.subject?.trim() || undefined;
  }
  if (Array.isArray(input.tags)) {
    prompt.tags = input.tags.map((t) => t.trim()).filter(Boolean);
  }
  if (typeof input.body === "string" && input.body !== prompt.body) {
    prompt.body = input.body;
    prompt.versions.push({ body: input.body, at: now, note: "تعديل" });
  }
  prompt.updatedAt = now;
  saveStore(store);
  return prompt;
}

export function duplicatePrompt(id: number): Prompt | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  const store = loadStore();
  const src = store.prompts.find((p) => p.id === id);
  if (!src) return null;
  const now = new Date().toISOString();
  const copy: Prompt = {
    ...src,
    id: store.nextId++,
    title: `${src.title} (نسخة)`,
    tags: [...src.tags],
    versions: [{ body: src.body, at: now, note: `نسخ من prompt #${src.id}` }],
    createdAt: now,
    updatedAt: now,
  };
  store.prompts.push(copy);
  saveStore(store);
  return copy;
}

export function deletePrompt(id: number): boolean {
  if (!Number.isInteger(id) || id <= 0) return false;
  const store = loadStore();
  const before = store.prompts.length;
  store.prompts = store.prompts.filter((p) => p.id !== id);
  if (store.prompts.length === before) return false;
  saveStore(store);
  return true;
}

export function getPromptVersionBody(id: number, versionIndex: number): string | null {
  if (!Number.isInteger(versionIndex) || versionIndex < 0) return null;
  const prompt = getPrompt(id);
  if (!prompt) return null;
  return prompt.versions[versionIndex]?.body ?? null;
}

export interface PromptSearchQuery {
  q?: string;
  category?: PromptCategory;
  subject?: string;
  tag?: string;
}

/** Case-insensitive filter over title/body/subject/tags. */
export function searchPrompts(query: PromptSearchQuery = {}): Prompt[] {
  let list = loadStore().prompts;
  if (query.category) list = list.filter((p) => p.category === query.category);
  if (query.subject) {
    const s = query.subject.toLowerCase();
    list = list.filter((p) => (p.subject ?? "").toLowerCase().includes(s));
  }
  if (query.tag) {
    const t = query.tag.toLowerCase();
    list = list.filter((p) => p.tags.some((x) => x.toLowerCase() === t));
  }
  if (query.q && query.q.trim()) {
    const q = query.q.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        (p.subject ?? "").toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  return list;
}

export interface PromptExportBundle {
  format: "washi.prompt-library";
  version: 1;
  exportedAt: string;
  prompts: Prompt[];
}

export function exportPrompts(): PromptExportBundle {
  return {
    format: "washi.prompt-library",
    version: 1,
    exportedAt: new Date().toISOString(),
    prompts: loadStore().prompts,
  };
}

export interface ImportResult {
  added: number;
  skipped: number;
  errors: string[];
}

/**
 * Merge-import prompts. Existing ids are kept; incoming prompts with
 * duplicate ids are skipped (not overwritten). New ids are assigned.
 */
export function importPrompts(bundle: unknown, opts: { replace?: boolean } = {}): ImportResult {
  if (!bundle || typeof bundle !== "object") {
    return { added: 0, skipped: 0, errors: ["bundle is not an object"] };
  }
  const o = bundle as Record<string, unknown>;
  const rawList = Array.isArray(o.prompts) ? o.prompts : Array.isArray(bundle) ? (bundle as unknown[]) : null;
  if (!rawList) return { added: 0, skipped: 0, errors: ["bundle.prompts missing"] };

  const store = loadStore();
  if (opts.replace) {
    store.prompts = [];
    store.nextId = 1;
  }
  const existingIds = new Set(store.prompts.map((p) => p.id));
  const existingTitles = new Set(store.prompts.map((p) => p.title));

  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const raw of rawList) {
    const c = coercePrompt(raw);
    if (!c) {
      skipped += 1;
      errors.push("entry failed validation");
      continue;
    }
    if (existingTitles.has(c.title)) {
      skipped += 1;
      continue;
    }
    let id = c.id;
    if (existingIds.has(id)) {
      id = store.nextId;
    }
    if (id >= store.nextId) store.nextId = id + 1;
    const next: Prompt = { ...c, id };
    store.prompts.push(next);
    existingIds.add(id);
    existingTitles.add(next.title);
    added += 1;
  }

  saveStore(store);
  return { added, skipped, errors };
}

/** Absolute path of the active store (for tests/diagnostics). */
export function promptsFilePath(): string {
  return PROMPTS_FILE;
}
