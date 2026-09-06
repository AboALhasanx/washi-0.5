/**
 * cli/commands/delete.ts — remove a project. Destructive → needs --yes
 * (or an interactive confirm); never fires silently.
 */

import * as readline from "node:readline";
import * as process from "node:process";
import { Command } from "commander";
import { deleteProject, loadProject } from "../../lib/project";
import { EXIT, bold, failLine, okLine, out } from "../ui";

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(/^y(es)?$/i.test(ans.trim()) || ans.trim() === "نعم");
    }),
  );
}

export const deleteCommand = new Command("delete")
  .argument("<id>", "معرف المشروع")
  .option("--yes", "تأكيد آلي بدون سؤال")
  .option("--json", "مخرجات JSON")
  .description("حذف مشروع وكل نسخه وحزمه (يتطلب تأكيداً)")
  .action(async (id: string, opts: { yes?: boolean; json?: boolean }) => {
    const project = loadProject(id); // throws → NOT_FOUND via top-level mapper

    if (!opts.yes) {
      if (!process.stdin.isTTY) {
        failLine("حذف دائم يتطلب تأكيداً — أضف --yes في البيئات غير التفاعلية");
        process.exit(EXIT.REFUSED);
      }
      const answer = await confirm(
        `سيُحذف «${project.metadata.title}» بكل نسخه (${project.metadata.publicationCount} حزمة). اكتب نعم للمتابعة: `,
      );
      if (!answer) {
        failLine("أُلغي الحذف");
        process.exit(EXIT.REFUSED);
      }
    }

    const gone = deleteProject(id);
    if (opts.json) {
      out(JSON.stringify({ deleted: gone }));
      return;
    }
    if (gone) okLine(`حُذف ${bold(id)} وكل مخطوطاته`);
    else {
      failLine("تعذر الحذف — المجلد مقيّد على القرص");
      process.exit(EXIT.UNEXPECTED);
    }
  });
