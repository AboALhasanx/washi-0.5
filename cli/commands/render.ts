/**
 * cli/commands/render.ts — fresh render of the current draft.
 * Orchestration (render → write pdf/ast/app-content) lives in Core
 * (renderPreviewToDir); this command is presentation only. Errors propagate
 * to the top-level mapper (parse refusals → exit 1, missing → 2, else 4).
 */

import { Command } from "commander";
import { renderPreviewToDir } from "../../lib/project";
import { bold, dim, log, okLine, out } from "../ui";
import { wantsJson } from "../shared";

export const renderCommand = new Command("render")
  .argument("<id>", "معرف المشروع")
  .option("--out <dir>", "مجلد المخرجات", (v) => v)
  .option("--json", "مخرجات JSON")
  .description("رندر PDF حديث + ملفات AST/app-content (معاينة — ليست حزمة النشر)")
  .action(async (id: string, opts: { out?: string; json?: boolean }) => {
    const { dir, pdfPath, ms } = await renderPreviewToDir(id, opts.out);
    if (wantsJson(opts)) {
      out(JSON.stringify({ dir, pdfPath, ms }));
      return;
    }
    okLine(`تم الرندر عبر takumi في ${ms}ms`);
    log(`  ${bold("document.pdf")}        ${pdfPath}`);
    log(`  ${dim("document.ast + app-content.json")}  ${dim(dir)}`);
    log(dim("  هذه معاينة — لنشر حزمة مجمّدة: washi publish"));
  });
