/**
 * cli/commands/demo.ts — the product pitch in one command: run the full
 * lifecycle against the comprehensive sample chapter and watch every gate.
 */

import * as process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { buildTraceModel, createProject, publishProject, validateProject, verifyPublication } from "../../lib/project";
import { EXIT, bold, dim, failLine, green, hrule, infoLine, log, okLine, out } from "../ui";

const SAMPLE = path.join("public", "samples", "computer-networks-ch1.md");

export const demoCommand = new Command("demo")
  .option("--json", "مخرجات JSON")
  .description("دورة حياة كاملة (إنشاء ← تحقق ← نشر ← تدقيق ← تتبع) على الفصل الشامل")
  .action(async (opts: { json?: boolean }) => {
    if (!fs.existsSync(SAMPLE)) {
      failLine(`النموذج غير موجود: ${SAMPLE}`);
      process.exit(EXIT.UNEXPECTED);
    }
    const markdown = fs.readFileSync(SAMPLE, "utf8");
    const steps: Array<{ step: string; result: unknown }> = [];

    hrule();
    log(bold("واشي CLI — عرض دورة الحياة الكاملة"));
    hrule();

    infoLine("1/5 إنشاء المشروع من الفصل الشامل");
    const metadata = createProject({ title: "عرض CLI — فصل شبكات كامل", markdown });
    steps.push({ step: "create", result: metadata });
    okLine(`id: ${metadata.id}`);

    infoLine("2/5 التحقق الهيكلي");
    const validation = validateProject(metadata.id);
    if (!validation.ok) {
      failLine(`النموذج فاشل تحققاً (${validation.errors} أخطاء)؟! هذا عيب في المستودع`);
      process.exit(EXIT.UNEXPECTED);
    }
    okLine(`صالح هيكلياً — ${validation.warnings} تحذير`);
    steps.push({ step: "validate", result: validation });

    infoLine("3/5 نشر الحزمة (Publish = Freeze)");
    const pub = await publishProject(metadata.id);
    okLine(`v${pub.version} — ${pub.manifest.hashes.contentSha256.slice(0, 12)}…`);
    steps.push({ step: "publish", result: { version: pub.version, dir: pub.dir } });

    infoLine("4/5 تدقيق السلامة (إعادة حساب الهاشات)");
    const verify = verifyPublication(metadata.id, pub.version);
    if (verify.status !== "ok") {
      failLine("الحزمة غير سليمة بعد النشر مباشرة؟!");
      process.exit(EXIT.UNEXPECTED);
    }
    okLine(green("الحزمة سليمة — الهاشات مطابقة"));
    steps.push({ step: "verify", result: verify });

    infoLine("5/5 قراءة نموذج الاستهلاك");
    const model = buildTraceModel(metadata.id, pub.version);
    const ac = model.appContent as unknown as {
      stats: Record<string, number>;
      concepts: Array<{ term: string }>;
    };
    log(`  مفاهيم ${ac.stats.concepts} · بطاقات فلاش ${ac.stats.flashcards} · أسئلة ${ac.stats.questionCandidates}`);
    steps.push({ step: "trace", result: { stats: ac.stats } });

    if (opts.json) out(JSON.stringify({ steps }));
    log(dim(`\n  نظّف لاحقاً: washi delete ${metadata.id} --yes`));
  });
