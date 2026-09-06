/**
 * lib/prompts.ts
 * Washi 0.5 Prompt Library — Washi does not generate content. It stores,
 * versions, and hands off prompts to external AI tools (ChatGPT, Claude,
 * Gemini, Kimi...); the resulting Markdown returns to Washi as content.md.
 *
 * Categories per bootstrap doc: Global / Subject / Chapter / Formatting.
 * Stored as JSON under .washi/prompts.json (filesystem-first, no DB).
 */

import fs from "node:fs";
import path from "node:path";

const PROMPTS_FILE = path.join(process.cwd(), ".washi", "prompts.json");

export type PromptCategory = "global" | "subject" | "chapter" | "formatting";

export interface PromptVersion {
  body: string;
  at: string;
  note?: string;
}

export interface Prompt {
  id: number;
  title: string;
  category: PromptCategory;
  subject?: string;
  body: string;
  versions: PromptVersion[];
  createdAt: string;
  updatedAt: string;
}

export const PROMPT_CATEGORIES: Array<{ id: PromptCategory; label: string; hint: string }> = [
  { id: "global", label: "قواعد عامة", hint: "Global Rules — تُلحق بكل prompt" },
  { id: "subject", label: "قواعد المادة", hint: "Subject Rules — لكل مادة دراسية" },
  { id: "chapter", label: "قواعد الفصل", hint: "Chapter Rules — هيكلة الفصل الواحد" },
  { id: "formatting", label: "قواعد التنسيق", hint: "Formatting Rules — صيغة Markdown المستهدفة" },
];

interface PromptStore {
  nextId: number;
  prompts: Prompt[];
}

function loadStore(): PromptStore {
  try {
    const raw = JSON.parse(fs.readFileSync(PROMPTS_FILE, "utf8"));
    return { nextId: raw.nextId ?? 1, prompts: Array.isArray(raw.prompts) ? raw.prompts : [] };
  } catch {
    return { nextId: 1, prompts: [] };
  }
}

function saveStore(store: PromptStore) {
  fs.mkdirSync(path.dirname(PROMPTS_FILE), { recursive: true });
  fs.writeFileSync(PROMPTS_FILE, JSON.stringify(store, null, 2), "utf8");
}

export function listPrompts(): Prompt[] {
  return loadStore().prompts;
}

export function getPrompt(id: number): Prompt | null {
  return loadStore().prompts.find((p) => p.id === id) ?? null;
}

export interface PromptInput {
  title: string;
  category: PromptCategory;
  subject?: string;
  body: string;
}

export function createPrompt(input: PromptInput): Prompt {
  const store = loadStore();
  const now = new Date().toISOString();
  const prompt: Prompt = {
    id: store.nextId++,
    title: input.title,
    category: input.category,
    subject: input.subject,
    body: input.body,
    versions: [{ body: input.body, at: now, note: "الإنشاء" }],
    createdAt: now,
    updatedAt: now,
  };
  store.prompts.push(prompt);
  saveStore(store);
  return prompt;
}

export function updatePrompt(id: number, input: Partial<PromptInput>): Prompt | null {
  const store = loadStore();
  const prompt = store.prompts.find((p) => p.id === id);
  if (!prompt) return null;
  const now = new Date().toISOString();
  if (typeof input.title === "string") prompt.title = input.title;
  if (typeof input.category === "string") prompt.category = input.category;
  if (typeof input.subject === "string") prompt.subject = input.subject;
  if (typeof input.body === "string" && input.body !== prompt.body) {
    prompt.body = input.body;
    prompt.versions.push({ body: input.body, at: now, note: "تعديل" });
  }
  prompt.updatedAt = now;
  saveStore(store);
  return prompt;
}

export function duplicatePrompt(id: number): Prompt | null {
  const store = loadStore();
  const src = store.prompts.find((p) => p.id === id);
  if (!src) return null;
  const now = new Date().toISOString();
  const copy: Prompt = {
    ...src,
    id: store.nextId++,
    title: `${src.title} (نسخة)`,
    versions: [{ body: src.body, at: now, note: `نسخ من prompt #${src.id}` }],
    createdAt: now,
    updatedAt: now,
  };
  store.prompts.push(copy);
  saveStore(store);
  return copy;
}

export function deletePrompt(id: number): boolean {
  const store = loadStore();
  const before = store.prompts.length;
  store.prompts = store.prompts.filter((p) => p.id !== id);
  saveStore(store);
  return store.prompts.length < before;
}

export function getPromptVersionBody(id: number, versionIndex: number): string | null {
  const prompt = getPrompt(id);
  if (!prompt) return null;
  return prompt.versions[versionIndex]?.body ?? null;
}
