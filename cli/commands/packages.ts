/**
 * cli/commands/packages.ts — list the frozen publication packages + hashes.
 */

import { Command } from "commander";
import { loadPublication } from "../../lib/project";
import { dim, out, table } from "../ui";
import { mustLoadProject, wantsJson } from "../shared";

export const packagesCommand = new Command("packages")
  .argument("<id>", "معرف المشروع")
  .option("--json", "مخرجات JSON")
  .description("سرد حزم النشر المجمدة مع الهاشات وتوثيق الأدوات")
  .action((id: string, opts: { json?: boolean }) => {
    const project = mustLoadProject(id);
    const rows: string[][] = [];
    const json: unknown[] = [];

    for (let v = 1; v <= project.metadata.publicationCount; v++) {
      try {
        const { manifest } = loadPublication(id, v);
        json.push(manifest);
        const contentHash = manifest.hashes
          ? manifest.hashes.contentSha256.slice(0, 12) + "…"
          : "قديمة بلا هاشات";
        const pdfHash = manifest.hashes
          ? manifest.hashes.pdfSha256.slice(0, 12) + "…"
          : "—";
        rows.push([
          `v${v}`,
          manifest.publishedAt.slice(0, 16).replace("T", " "),
          manifest.hashes ? contentHash : "قديمة بلا هاشات",
          manifest.hashes ? pdfHash : "—",
          manifest.toolchain?.takumi ?? "—",
        ]);
      } catch {
        // gap in publication numbering — report it, don't hide it
        rows.push([`v${v}`, "—", "غير موجودة", "—", "—"]);
      }
    }

    if (opts.json) {
      out(JSON.stringify({ publications: json }));
      return;
    }
    if (rows.length === 0) {
      out(dim("لا حزم منشورة — washi publish " + id));
      return;
    }
    table(["الحزمة", "التاريخ", "content.sha256", "pdf.sha256", "takumi"], rows);
  });
