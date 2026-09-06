/**
 * cli/commands/verify.ts — package integrity audit (CLI-exclusive capability).
 * Recomputes sha256 of the frozen files and compares them against the hashes
 * recorded in the manifest at publish time. Any silent tampering/corruption
 * of the immutable package surfaces here.
 */

import fs from "node:fs";
import path from "node:path";
import * as process from "node:process";
import { Command } from "commander";
import { loadPublication } from "../../lib/project";
import { EXIT, bold, dim, failLine, green, log, okLine, out } from "../ui";
import { sha256File, wantsJson } from "../shared";

export const verifyCommand = new Command("verify")
  .argument("<id>", "معرف المشروع")
  .option("--version <n>", "حزمة محددة (افتراضياً كل الحزم)")
  .option("--json", "مخرجات JSON")
  .description("تدقيق سلامة الحزم: إعادة حساب الهاشات مقابل الـ manifest")
  .action((id: string, opts: { version?: string; json?: boolean }) => {
    const versions: number[] = opts.version
      ? [Number(opts.version)]
      : // probe which frozen versions exist
        Array.from({ length: 50 }, (_, i) => i + 1).filter((v) => {
          try {
            loadPublication(id, v);
            return true;
          } catch {
            return false;
          }
        });

    if (versions.length === 0) {
      failLine("لا حزم موجودة لهذا المشروع");
      process.exit(EXIT.NOT_FOUND);
    }

    type Status = "ok" | "mismatch" | "legacy";
    const results = versions.map((v) => {
      try {
        const { manifest } = loadPublication(id, v);
        const pubDir = path.join("projects", id, "publications", `v${v}`);
        // Packages published before the hardening pass carry no hashes —
        // they are unverifiable, not tampered; republish to gain the audit.
        if (!manifest.hashes?.contentSha256) {
          return { version: v, status: "legacy" as Status };
        }
        const contentOk = sha256File(path.join(pubDir, "content.md")) === manifest.hashes.contentSha256;
        const pdfPath = path.join(pubDir, "document.pdf");
        const pdfOk = fs.existsSync(pdfPath) && sha256File(pdfPath) === manifest.hashes.pdfSha256;
        return { version: v, status: (contentOk && pdfOk ? "ok" : "mismatch") as Status, contentOk, pdfOk };
      } catch (e: any) {
        return { version: v, status: "mismatch" as Status, error: e?.message };
      }
    });

    if (opts.json) {
      out(JSON.stringify({ id, results }));
      process.exit(results.some((r) => r.status === "mismatch") ? EXIT.REFUSED : EXIT.OK);
    }
    let mismatch = false;
    for (const r of results) {
      if (r.status === "ok") okLine(green(`v${r.version} سليمة — الهاشات مطابقة`));
      else if (r.status === "legacy") log(`  ▲ v${r.version} قديمة بلا هاشات — أعد النشر لتدقيق السلامة`);
      else {
        mismatch = true;
        failLine(`v${r.version} مخالفة! ${!r.contentOk ? "content.md متغير " : ""}${!r.pdfOk ? "document.pdf متغير" : ""}`);
      }
    }
    log(dim("  الحزمة المجمدة يجب ألا تتغير أبداً — أي اختلاف يعني عبثاً أو تلفاً"));
    process.exit(mismatch ? EXIT.REFUSED : EXIT.OK);
  });
