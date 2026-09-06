/**
 * cli/commands/restore.ts — bring an old snapshot back as a NEW current version
 * (history is append-only; restoring never rewrites the past).
 */

import { Command } from "commander";
import * as process from "node:process";
import { restoreSnapshot } from "../../lib/project";
import { failLine, okLine, out } from "../ui";
import { EXIT } from "../ui";
import { wantsJson } from "../shared";

export const restoreCommand = new Command("restore")
  .argument("<id>", "معرف المشروع")
  .argument("<version>", "رقم النسخة المستهدفة")
  .option("--json", "مخرجات JSON")
  .description("استعادة نسخة سابقة (تصبح نسخة حالية جديدة)")
  .action((id: string, version: string, opts: { json?: boolean }) => {
    if (!/^\d+$/.test(version) || Number(version) < 1) {
      failLine("رقم النسخة يجب أن يكون عدداً صحيحاً موجباً");
      process.exit(EXIT.USAGE);
    }
    const metadata = restoreSnapshot(id, Number(version));
    if (opts.json) {
      out(JSON.stringify({ currentVersion: metadata.currentVersion }));
      return;
    }
    okLine(`تمت الاستعادة من v${version} — النسخة الحالية الآن v${metadata.currentVersion}`);
  });
