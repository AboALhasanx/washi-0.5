/**
 * cli/commands/publish.ts — Publish = Freeze.
 * The exact same atomic publishProject() the Studio calls: validate → parse →
 * render → package → tmp-dir verify → rename. Refuses on structural errors.
 */

import * as process from "node:process";
import { Command } from "commander";
import { publishProject } from "../../lib/project";
import { EXIT, bold, dim, failLine, green, log, okLine, out } from "../ui";
import { wantsJson } from "../shared";

export const publishCommand = new Command("publish")
  .argument("<id>", "معرف المشروع")
  .option("--yes", "تأكيد آلي (للسكربتات ووكلاء الـ AI)")
  .option("--json", "مخرجات JSON")
  .description("نشر الحزمة — تجميد غير قابل للتعديل مع هاشات وتوثيق أدوات")
  .action(async (id: string, opts: { yes?: boolean; json?: boolean }) => {
    if (!opts.yes && process.stdin.isTTY) {
      // deliberate publication is a real event; ask once when a human is attached
      failLine("النشر يجمد حزمة دائمة — أضف --yes للتأكيد");
      process.exit(EXIT.USAGE);
    }
    try {
      const result = await publishProject(id);
      if (opts.json) {
        out(JSON.stringify(result));
        return;
      }
      okLine(green(`نُشرت الحزمة v${result.version} — غير قابلة للتعديل`));
      log(`  ${bold("dir")}     ${result.dir}`);
      log(`  ${bold("content")} ${result.manifest.hashes.contentSha256.slice(0, 16)}…`);
      log(`  ${bold("pdf")}     ${result.manifest.hashes.pdfSha256.slice(0, 16)}…`);
      log(`  ${dim("تدقيق لاحق: washi verify " + id)}`);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      failLine(`رُفض النشر — ${msg}`);
      log(dim("  ↳ شخّص أولاً: washi validate " + id));
      process.exit(EXIT.REFUSED);
    }
  });
