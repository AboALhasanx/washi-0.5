/**
 * cli/commands/demo.ts — the product pitch in one command: run the full
 * lifecycle against the comprehensive sample chapter and watch every gate.
 */

import * as process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { createProject, publishProject, validateProject, loadPublication } from "../../lib/project";
import { EXIT, bold, dim, failLine, green, hrule, infoLine, log, okLine, out } from "../ui";
import { sha256File } from "../shared";

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
    const contentOk = sha256File(path.join(pub.dir, "content.md")) === pub.manifest.hashes.contentSha256;
    const pdfOk = sha256File(path.join(pub.dir, "document.pdf")) === pub.manifest.hashes.pdfSha256;
    if (!contentOk || !pdfOk) {
      failLine("الهاشات غير مطابقة بعد النشر مباشرة؟!");
      process.exit(EXIT.UNEXPECTED);
    }
    okLine(green("الحزمة سليمة — الهاشات مطابقة"));
    steps.push({ step: "verify", result: { contentOk, pdfOk } });

    infoLine("5/5 قراءة نموذج الاستهلاك");
    const { appContent } = loadPublication(metadata.id, pub.version);
    log(`  مفاهيم ${appContent.stats.concepts} · بطاقات فلاش ${appContent.stats.flashcards} · أسئلة ${appContent.stats.questionCandidates}`);
    steps.push({ step: "trace", result: { stats: appContent.stats } });

    if (opts.json) out(JSON.stringify({ steps }));
    log(dim(`\n  نظّف لاحقاً: washi delete ${metadata.id} --yes`));
  });
