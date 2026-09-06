/**
 * cli/commands/new.ts — create a project from a file or stdin.
 * This is the external-AI handoff point, headless: the exact same core call
 * the Studio's POST /api/projects performs (frontmatter gate included).
 */

import fs from "node:fs";
import * as process from "node:process";
import { Command } from "commander";
import { createProject } from "../../lib/project";
import { EXIT, bold, dim, failLine, log, okLine, out } from "../ui";
import { readStdin } from "../shared";

export const newCommand = new Command("new")
  .argument("<title>", "عنوان المشروع (يُشتق منه معرف آمن)")
  .option("--subject <subject>", "مادة المشروع (يُقرأ من frontmatter إن وُجد)")
  .option("--lang <lang>", "اللغة ar | en", "ar")
  .option("--file <path>", "اقرأ الـ Markdown من ملف (بدلاً من stdin)")
  .option("--json", "مخرجات JSON")
  .description("إنشاء مشروع جديد من Markdown (ملف أو stdin)")
  .action(async (title: string, opts: { subject?: string; lang: string; file?: string; json?: boolean }) => {
    let markdown: string;
    if (opts.file) {
      markdown = fs.readFileSync(opts.file, "utf8");
    } else if (!process.stdin.isTTY) {
      markdown = await readStdin();
    } else {
      failLine("لا محتوى — مرّر --file أو مرّر الـ Markdown عبر stdin");
      log(dim(`  ↳ مثال: cat ch1.md | npm run washi -- new "${title}"`));
      process.exit(EXIT.USAGE);
    }

    const metadata = createProject({
      title,
      subject: opts.subject,
      language: opts.lang === "en" ? "en" : "ar",
      markdown,
    });

    if (opts.json) {
      out(JSON.stringify({ project: metadata }));
      return;
    }
    okLine(`أُنشئ المشروع «${metadata.title}»`);
    log(`  ${bold("id")}     ${metadata.id}`);
    log(`  ${bold("المادة")}  ${metadata.subject}`);
    log(`  ${dim("الخطوة التالية: washi validate " + metadata.id)}`);
  });
