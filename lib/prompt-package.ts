/**
 * lib/prompt-package.ts
 * Assembles a single handoff Markdown file from selected prompts + source.
 * No LLM — this is what you paste into ChatGPT/Claude or download.
 */

export interface PackageSourceMeta {
  title: string;
  document: string;
  pages: string;
  subject?: string;
  language?: "ar" | "en";
}

export interface PackagePromptPart {
  title: string;
  body: string;
}

export interface AssembleInput {
  meta: PackageSourceMeta;
  prompts: PackagePromptPart[];
  sourceText: string;
}

/** Filename-safe slug for downloads. */
export function packageSlug(title: string): string {
  const t = (title || "washi-chapter").trim().slice(0, 48);
  const s = t
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "washi-chapter";
}

/** One .md handoff package: instructions stack + source payload. */
export function assemblePromptPackage(input: AssembleInput): string {
  const { meta, prompts, sourceText } = input;
  const subject = meta.subject?.trim() || "computer-networks";
  const pages = meta.pages.trim() || "1";
  const document = meta.document.trim() || "Source.pdf";
  const title = meta.title.trim() || "فصل جديد";

  const parts: string[] = [];
  parts.push(`# حزمة توليد فصل — واشي`);
  parts.push("");
  parts.push(`**المادة:** \`${subject}\``);
  parts.push(`**العنوان المقترح:** ${title}`);
  parts.push(`**المستند:** ${document}`);
  parts.push(`**الصفحات:** ${pages}`);
  parts.push("");
  parts.push(`> الصق هذه الحزمة كاملة في الـAI الخارجي. أخرج **Markdown فقط** — بلا شرح.`);
  parts.push("");

  if (!prompts.length) {
    parts.push(`## تعليمات`);
    parts.push(`حوّل المصدر أدناه إلى فصل واشي تعليمي.`);
    parts.push("");
  } else {
    let n = 1;
    for (const p of prompts) {
      parts.push(`## ${n}. ${p.title}`);
      parts.push("");
      parts.push(p.body.trim());
      parts.push("");
      n += 1;
    }
  }

  parts.push(`---`);
  parts.push("");
  parts.push(`## المصدر (Source payload)`);
  parts.push("");
  parts.push("```text");
  parts.push(sourceText.trim() || "(لا يوجد نص مصدر — ألصقه هنا)");
  parts.push("```");
  parts.push("");
  parts.push(`---`);
  parts.push("");
  parts.push(`## تذكير عقد الخرج`);
  parts.push("");
  parts.push("```yaml");
  parts.push("---");
  parts.push(`subject: ${subject}`);
  parts.push(`title: "${title}"`);
  parts.push(`language: ${meta.language ?? "ar"}`);
  parts.push("sources:");
  parts.push(`  - document: "${document}"`);
  parts.push(`    pages: [${pages}]`);
  parts.push("---");
  parts.push("```");
  parts.push("");
  parts.push("- H1 واحد ← أقسام H2");
  parts.push("- `<!-- source: ... p.N -->` لكل قسم منقول");
  parts.push("- `<!-- source: (generated) -->` للأسئلة/الخلاصة المولّدة");
  parts.push("- `> [!NOTE] **Term:**` للتعاريف");
  parts.push("- لا اختراع صفحات");

  return parts.join("\n").trim() + "\n";
}

/** Starter content.md scaffold with frontmatter filled (empty body sections). */
export function buildContentScaffold(meta: PackageSourceMeta): string {
  const subject = meta.subject?.trim() || "computer-networks";
  const pages = meta.pages.trim() || "1";
  const document = meta.document.trim() || "Source.pdf";
  const title = meta.title.trim() || "فصل جديد";
  return [
    "---",
    `subject: ${subject}`,
    `title: "${title}"`,
    `language: ${meta.language ?? "ar"}`,
    "sources:",
    `  - document: "${document}"`,
    `    pages: [${pages}]`,
    "---",
    "",
    `# ${title}`,
    "",
    `<!-- source: ${document} p.${pages.split(",")[0]?.trim() || "1"} -->`,
    "## نظرة عامة",
    "",
    "…",
    "",
    `<!-- source: ${document} p.${pages.split(",")[0]?.trim() || "1"} -->`,
    "## المفاهيم الأساسية",
    "",
    "> [!NOTE] **المصطلح (Term):** …",
    "",
    "## الشرح التفصيلي",
    "",
    "…",
    "",
    "<!-- source: (generated) -->",
    "## أسئلة مراجعة",
    "",
    "1. **سؤال؟**",
    "",
  ].join("\n");
}

/** Default preset titles to pre-check for a Networks chapter run. */
export const NETWORKS_DEFAULT_PRESET_MATCH = [
  "قواعد عامة",
  "هيكل فصل",
  "شبكات",
  "تنسيق",
];
