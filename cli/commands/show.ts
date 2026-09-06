/**
 * cli/commands/show.ts — one project's metadata + parser stats.
 */

import { Command } from "commander";
import { parseMarkdown } from "../../lib/markdown-parser";
import { buildDocumentAst } from "../../lib/artifacts";
import { bold, dim, log, out } from "../ui";
import { mustLoadProject, wantsJson } from "../shared";

export const showCommand = new Command("show")
  .argument("<id>", "معرف المشروع")
  .option("--json", "مخرجات JSON")
  .description("تفاصيل مشروع: الميتاداتا + إحصاءات المحتوى")
  .action((id: string, opts: { json?: boolean }) => {
    const project = mustLoadProject(id);
    const { ast } = parseMarkdown(project.content);
    const stats = buildDocumentAst(ast).stats;

    if (wantsJson(opts)) {
      out(
        JSON.stringify({
          metadata: project.metadata,
          stats,
        }),
      );
      return;
    }
    log(bold(project.metadata.title));
    log(`  ${"id"}      ${project.metadata.id}`);
    log(`  ${"الحالة"}  ${project.metadata.status}`);
    log(`  ${"النسخة"}  v${project.metadata.currentVersion} · منشورات ${project.metadata.publicationCount}`);
    log(`  ${dim("الأقسام")}  ${stats.sections} · ${dim("البلوكات")} ${stats.blocks} · ${dim("التعريفات")} ${stats.definitions} · ${dim("المعادلات")} ${stats.formulas}`);
    if (project.metadata.lastValidation) {
      const v = project.metadata.lastValidation;
      log(`  ${dim("آخر فحص")}  ${v.at.slice(0, 16).replace("T", " ")} — ${v.ok ? "صالح" : `فاشل (${v.errors} خطأ)`}`);
    }
  });
