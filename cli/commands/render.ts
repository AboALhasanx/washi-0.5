/**
 * cli/commands/render.ts — fresh render of the current draft.
 * Produces document.pdf + document.ast + app-content.json in an output
 * directory. This is a preview artifact — NOT the frozen package (publish is
 * the freeze; these files are re-rendered on every run).
 */

import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { renderChapterPdf } from "../../lib/render-pdf";
import { buildDocumentAst, buildAppContent } from "../../lib/artifacts";
import { parseMarkdown } from "../../lib/markdown-parser";
import { bold, dim, log, okLine, out } from "../ui";
import { mustLoadProject, wantsJson } from "../shared";

export const renderCommand = new Command("render")
  .argument("<id>", "معرف المشروع")
  .option("--out <dir>", "مجلد المخرجات", (v) => v)
  .option("--json", "مخرجات JSON")
  .description("رندر PDF حديث + ملفات AST/app-content (معاينة — ليست حزمة النشر)")
  .action(async (id: string, opts: { out?: string; json?: boolean }) => {
    const project = mustLoadProject(id);
    const outDir = path.resolve(opts.out ?? path.join("output", project.metadata.id));
    fs.mkdirSync(outDir, { recursive: true });

    const { pdf, ms } = await renderChapterPdf(project.content, project.template);
    const pdfPath = path.join(outDir, "document.pdf");
    fs.writeFileSync(pdfPath, pdf);

    const { ast } = parseMarkdown(project.content);
    fs.writeFileSync(path.join(outDir, "document.ast"), JSON.stringify(buildDocumentAst(ast), null, 2));
    fs.writeFileSync(path.join(outDir, "app-content.json"), JSON.stringify(buildAppContent(ast), null, 2));

    if (opts.json) {
      out(JSON.stringify({ dir: outDir, pdf: pdfPath, ms }));
      return;
    }
    okLine(`تم الرندر عبر takumi في ${ms}ms`);
    log(`  ${bold("document.pdf")}        ${pdfPath} (${(pdf.length / 1024).toFixed(1)} KB)`);
    log(`  ${dim("document.ast + app-content.json")}  ${dim(outDir)}`);
    log(dim("  هذه معاينة — لنشر حزمة مجمّدة: washi publish"));
  });
