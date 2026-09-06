/**
 * cli/commands/validate.ts — the structural gate, headless.
 * Exit 1 with the issue list is the machine-readable refusal signal.
 */

import * as process from "node:process";
import { Command } from "commander";
import { validateProject } from "../../lib/project";
import { EXIT, failLine, green, okLine, out, red } from "../ui";
import { printIssues, wantsJson } from "../shared";

export const validateCommand = new Command("validate")
  .argument("<id>", "معرف المشروع")
  .option("--json", "مخرجات JSON")
  .description("تحقق هيكلي من المحتوى (المكونات، المعادلات، الأقسام)")
  .action((id: string, opts: { json?: boolean }) => {
    const result = validateProject(id);
    if (opts.json) {
      out(JSON.stringify(result));
    } else if (result.ok) {
      okLine(`صالح هيكلياً (${result.warnings} تحذير)`);
      if (result.issues.some((i) => i.kind === "warning")) printIssues(result.issues);
    } else {
      failLine(`${result.errors} خطأ هيكلي — ${result.warnings} تحذير`);
      printIssues(result.issues);
    }
    process.exit(result.ok ? EXIT.OK : EXIT.REFUSED);
  });
