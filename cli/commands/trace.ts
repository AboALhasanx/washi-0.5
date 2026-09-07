/**
 * cli/commands/trace.ts — the platform-consumer read model, headless.
 * Live draft by default; --version N reads the frozen publication instead.
 * --json IS the contract the educational platform consumes (display/link/analyze).
 */

import { Command } from "commander";
import { buildDocumentAst, buildAppContent } from "../../lib/artifacts";
import { parseMarkdown } from "../../lib/markdown-parser";
import { loadProject, loadPublication } from "../../lib/project";
import { bold, dim, log, out } from "../ui";
import { wantsJson } from "../shared";

export const traceCommand = new Command("trace")
  .argument("<id>", "معرف المشروع")
  .option("--version <n>", "اقرأ حزمة منشورة vN بدل المسودة الحية")
  .option("--json", "مخرجات JSON (نموذج الاستهلاك الكامل)")
  .description("نموذج ما ستستهلكه المنصة: AST + مفاهيم + بطاقات + أسئلة")
  .action((id: string, opts: { version?: string; json?: boolean }) => {
    let source: string;
    let documentAst: unknown;
    let appContent: {
      stats: Record<string, number>;
      concepts: Array<{ term: string }>;
      flashcards: unknown[];
      questionCandidates: unknown[];
    };

    if (opts.version) {
      const pub = loadPublication(id, Number(opts.version));
      source = `publication v${opts.version}`;
      documentAst = pub.documentAst;
      appContent = pub.appContent as unknown as typeof appContent;
    } else {
      const project = loadProject(id);
      const { ast } = parseMarkdown(project.content);
      source = "live (current draft)";
      documentAst = buildDocumentAst(ast);
      appContent = buildAppContent(ast) as unknown as typeof appContent;
    }

    if (opts.json) {
      out(JSON.stringify({ source, documentAst, appContent }));
      return;
    }
    log(bold(`تتبع: ${id}  ${dim(`(${source})`)}`));
    const docStats = (documentAst as { stats: Record<string, number> }).stats;
    log(`  أقسام ${docStats.sections} · بلوكات ${appContent.stats.blocks} · مفاهيم ${appContent.stats.concepts} · بطاقات ${appContent.stats.flashcards} · أسئلة ${appContent.stats.questionCandidates}`);
    for (const c of appContent.concepts.slice(0, 8)) {
      log(`  ◆ ${c.term}`);
    }
    const rest = appContent.concepts.length - 8;
    if (rest > 0) log(dim(`  … و ${rest} مفاهيم أخرى`));
    log(dim("  المخرجات الكاملة: أضف --json"));
  });
