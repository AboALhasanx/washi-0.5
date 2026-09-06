/**
 * cli/commands/edit.ts — open content.md in $EDITOR, then run the parser
 * gate before persisting (the same gate the Studio's save applies).
 */

import * as process from "node:process";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { Command } from "commander";
import { parseMarkdown } from "../../lib/markdown-parser";
import { saveProject } from "../../lib/project";
import { EXIT, bold, dim, failLine, log, okLine } from "../ui";
import { mustLoadProject } from "../shared";

export const editCommand = new Command("edit")
  .argument("<id>", "معرف المشروع")
  .description("فتح content.md في المحرر — الحفظ يمر ببوابة المحلل")
  .action((id: string) => {
    const project = mustLoadProject(id);
    const file = path.join("projects", project.metadata.id, "content.md");
    const editor = process.env.EDITOR || process.env.VISUAL;

    if (!editor) {
      failLine("لا يوجد محرر مضبوط — اضبط EDITOR");
      log(`  ${dim("المسار المباشر:")} ${file}`);
      log(dim(`  ↳ مثال: EDITOR="code -w" npm run washi -- edit ${id}`));
      process.exit(EXIT.OK);
    }

    const result = spawnSync(editor, [file], { stdio: "inherit", shell: true });
    if (result.status !== 0) {
      failLine("المحرر خرج بخطأ — لم يُحفظ شيء");
      process.exit(EXIT.UNEXPECTED);
    }

    const content = fs.readFileSync(file, "utf8");
    try {
      parseMarkdown(content); // gate: content edits must still parse
    } catch (e: any) {
      failLine(`التعديل لا يمر بوابة المحلل — ${e?.message}`);
      log(dim("  ↳ صحّح الملف وأعد المحاولة، أو washi validate للتفاصيل"));
      process.exit(EXIT.REFUSED);
    }
    saveProject(id, { content, snapshotVersion: false });
    okLine(`حُفظ ${bold(file)} بنجاح`);
  });
