/**
 * cli/commands/snapshot.ts — freeze a named version of the current draft.
 */

import { Command } from "commander";
import { saveProject } from "../../lib/project";
import { okLine, out } from "../ui";
import { wantsJson } from "../shared";

export const snapshotCommand = new Command("snapshot")
  .argument("<id>", "معرف المشروع")
  .option("--json", "مخرجات JSON")
  .description("إنشاء نسخة محفوظة (snapshot) من المحتوى والقالب الحاليين")
  .action((id: string, opts: { json?: boolean }) => {
    const metadata = saveProject(id, { snapshotVersion: true });
    if (opts.json) {
      out(JSON.stringify({ currentVersion: metadata.currentVersion }));
      return;
    }
    okLine(`أُنشئت النسخة v${metadata.currentVersion}`);
  });
