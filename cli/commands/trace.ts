/**
 * cli/commands/trace.ts — the platform-consumer read model, headless.
 * Live draft by default; --version N reads the frozen publication instead.
 * --json IS the contract the educational platform consumes (display/link/analyze).
 */

import * as process from "node:process";
import { Command } from "commander";
import { buildTraceModel } from "../../lib/project";
import { EXIT, bold, dim, failLine, log, out } from "../ui";
import { wantsJson } from "../shared";

export const traceCommand = new Command("trace")
  .argument("<id>", "معرف المشروع")
  .option("--version <n>", "اقرأ حزمة منشورة vN بدل المسودة الحية")
  .option("--json", "مخرجات JSON (نموذج الاستهلاك الكامل)")
  .description("نموذج ما ستستهلكه المنصة: AST + مفاهيم + بطاقات + أسئلة")
  .action((id: string, opts: { version?: string; json?: boolean }) => {
    let version: number | undefined;
    if (opts.version !== undefined) {
      if (!/^\d+$/.test(opts.version) || Number(opts.version) < 1) {
        failLine("رقم الإصدار يجب أن يكون عدداً صحيحاً موجباً");
        process.exit(EXIT.USAGE);
      }
      version = Number(opts.version);
    }
    const model = buildTraceModel(id, version);
    const ac = model.appContent as unknown as {
      stats: Record<string, number>;
      concepts: Array<{ term: string }>;
      flashcards: unknown[];
      questionCandidates: unknown[];
    };
    const docStats = (model.documentAst as { stats: Record<string, number> }).stats;

    if (wantsJson(opts)) {
      out(JSON.stringify(model));
      return;
    }
    log(bold(`تتبع: ${id}  ${dim(`(${model.source})`)}`));
    log(`  أقسام ${docStats.sections} · بلوكات ${ac.stats.blocks} · مفاهيم ${ac.stats.concepts} · بطاقات ${ac.stats.flashcards} · أسئلة ${ac.stats.questionCandidates}`);
    for (const c of ac.concepts.slice(0, 8)) {
      log(`  ◆ ${c.term}`);
    }
    const rest = ac.concepts.length - 8;
    if (rest > 0) log(dim(`  … و ${rest} مفاهيم أخرى`));
    log(dim("  المخرجات الكاملة: أضف --json"));
  });
