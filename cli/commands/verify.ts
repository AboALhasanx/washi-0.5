/**
 * cli/commands/verify.ts — package integrity audit (CLI-exclusive capability).
 * Semantics live in Core (verifyPublication): recompute sha256 of the frozen
 * files vs the manifest. "legacy" = published before hashes existed —
 * unverifiable, not tampered; republish to gain the audit.
 */

import * as process from "node:process";
import { Command } from "commander";
import { listPublicationManifests, verifyPublication } from "../../lib/project";
import { EXIT, dim, failLine, green, log, okLine, out } from "../ui";
import { wantsJson } from "../shared";

export const verifyCommand = new Command("verify")
  .argument("<id>", "معرف المشروع")
  .option("--version <n>", "حزمة محددة (افتراضياً كل الحزم المجمدة)")
  .option("--json", "مخرجات JSON")
  .description("تدقيق سلامة الحزم: إعادة حساب الهاشات مقابل الـ manifest")
  .action((id: string, opts: { version?: string; json?: boolean }) => {
    let versions: number[];
    if (opts.version !== undefined) {
      if (!/^\d+$/.test(opts.version) || Number(opts.version) < 1) {
        failLine("رقم الإصدار يجب أن يكون عدداً صحيحاً موجباً");
        process.exit(EXIT.USAGE);
      }
      versions = [Number(opts.version)];
    } else {
      versions = listPublicationManifests(id).map((m) => m.version);
    }

    if (versions.length === 0) {
      failLine("لا حزم موجودة لهذا المشروع");
      process.exit(EXIT.NOT_FOUND);
    }

    const results = versions.map((v) => verifyPublication(id, v));

    if (wantsJson(opts)) {
      out(JSON.stringify({ id, results }));
      process.exit(results.some((r) => r.status === "mismatch") ? EXIT.REFUSED : EXIT.OK);
    }
    let mismatch = false;
    for (const r of results) {
      if (r.status === "ok") okLine(green(`v${r.version} سليمة — الهاشات مطابقة`));
      else if (r.status === "legacy") log(`  ▲ v${r.version} قديمة بلا هاشات — أعد النشر لتدقيق السلامة`);
      else if (r.status === "missing") failLine(`v${r.version} غير موجودة`);
      else {
        mismatch = true;
        failLine(`v${r.version} مخالفة! ${!r.contentOk ? "content.md متغير " : ""}${!r.pdfOk ? "document.pdf متغير" : ""}`);
      }
    }
    log(dim("  الحزمة المجمدة يجب ألا تتغير أبداً — أي اختلاف يعني عبثاً أو تلفاً"));
    process.exit(mismatch ? EXIT.REFUSED : EXIT.OK);
  });
