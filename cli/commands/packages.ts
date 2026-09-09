/**
 * cli/commands/packages.ts — list the frozen publication packages + hashes.
 * Semantics (manifest discovery, legacy handling) live in Core.
 */

import { Command } from "commander";
import { listPublicationManifests } from "../../lib/project";
import { dim, out, table } from "../ui";
import { wantsJson } from "../shared";

export const packagesCommand = new Command("packages")
  .argument("<id>", "معرف المشروع")
  .option("--json", "مخرجات JSON")
  .description("سرد حزم النشر المجمدة مع الهاشات وتوثيق الأدوات")
  .action((id: string, opts: { json?: boolean }) => {
    const manifests = listPublicationManifests(id);

    if (wantsJson(opts)) {
      out(JSON.stringify({ publications: manifests }));
      return;
    }
    if (manifests.length === 0) {
      out(dim("لا حزم منشورة — washi publish " + id));
      return;
    }
    table(
      ["الحزمة", "التاريخ", "content.sha256", "pdf.sha256", "takumi"],
      manifests.map((m) => [
        `v${m.version}`,
        m.publishedAt.slice(0, 16).replace("T", " "),
        m.hashes ? m.hashes.contentSha256.slice(0, 12) + "…" : "قديمة بلا هاشات",
        m.hashes ? m.hashes.pdfSha256.slice(0, 12) + "…" : "—",
        m.toolchain?.takumi ?? "—",
      ]),
    );
  });
