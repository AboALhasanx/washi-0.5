/**
 * cli/commands/list.ts — table of every project on disk.
 */

import { Command } from "commander";
import { listProjects } from "../../lib/project";
import { bold, dim, out, table } from "../ui";

const STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  review: "مراجعة",
  published: "منشور",
};

export const listCommand = new Command("list")
  .option("--json", "مخرجات JSON")
  .description("سرد كل المشاريع")
  .action((opts: { json?: boolean }) => {
    const projects = listProjects();
    if (opts.json) {
      out(JSON.stringify({ projects }));
      return;
    }
    if (projects.length === 0) {
      out(dim("لا مشاريع بعد — ابدأ بـ washi new"));
      return;
    }
    table(
      ["id", "العنوان", "الحالة", "النسخة", "منشورات", "آخر تحديث"],
      projects.map((p) => [
        p.id,
        p.title,
        STATUS_AR[p.status] ?? p.status,
        `v${p.currentVersion}`,
        String(p.publicationCount),
        p.updatedAt.slice(0, 10),
      ]),
    );
  });
