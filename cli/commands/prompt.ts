/**
 * cli/commands/prompt.ts — PS.1 Prompt Studio CLI (no LLM calls).
 * list | show | validate | render
 */

import fs from "node:fs";
import { Command } from "commander";
import {
  listPrompts,
  getPrompt,
  searchPrompts,
  exportPrompts,
  type PromptCategory,
} from "../../lib/prompts";
import {
  promptToSpec,
  promptSpecSchema,
  renderPrompt,
  checkOutputContract,
  type PromptSpec,
} from "../../lib/prompt-spec";
import { seedDefaultPrompts, ensurePromptLibrary } from "../../lib/prompt-seed";
import { EXIT, bold, dim, failLine, log, okLine, out } from "../ui";

function loadSpec(id: number, file?: string): PromptSpec {
  if (file) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return promptSpecSchema.parse(raw);
  }
  const p = getPrompt(id);
  if (!p) throw new Error(`لا يوجد prompt بالمعرف ${id}`);
  return promptToSpec(p);
}

export const promptCommand = new Command("prompt")
  .description("مكتبة البرومبت — list/show/validate/render (بدون استدعاء LLM)");

promptCommand
  .command("seed")
  .description("تعبئة المكتبة بالبرومبتات الافتراضية (idempotent)")
  .option("--force-if-empty", "شغّل فقط إذا كانت المكتبة فارغة")
  .option("--json", "JSON")
  .action((opts: { forceIfEmpty?: boolean; json?: boolean }) => {
    const result = opts.forceIfEmpty ? ensurePromptLibrary() : seedDefaultPrompts();
    if (opts.json) {
      out(JSON.stringify(result));
      return;
    }
    if (result.added === 0) {
      okLine(`لا جديد — المكتبة فيها ${listPrompts().length} prompts (تخطّي ${result.skipped})`);
      return;
    }
    okLine(`أُضيف ${result.added} prompts (تخطّي ${result.skipped})`);
    for (const t of result.titles) log(`  + ${t}`);
    log(dim("التالي: washi prompt list"));
  });

promptCommand
  .command("list")
  .option("--json", "JSON")
  .option("--q <q>", "بحث نصي")
  .option("--category <c>", "global|subject|chapter|formatting")
  .option("--tag <t>", "وسم")
  .action((opts: { json?: boolean; q?: string; category?: string; tag?: string }) => {
    ensurePromptLibrary();
    const prompts =
      opts.q || opts.category || opts.tag
        ? searchPrompts({
            q: opts.q,
            category: opts.category as PromptCategory | undefined,
            tag: opts.tag,
          })
        : listPrompts();
    if (opts.json) {
      out(JSON.stringify({ prompts }));
      return;
    }
    if (!prompts.length) {
      log(dim("لا توجد prompts"));
      return;
    }
    for (const p of prompts) {
      log(`${bold(String(p.id))}  [${p.category}]  ${p.title}${p.tags.length ? "  " + dim("#" + p.tags.join(" #")) : ""}`);
    }
  });

promptCommand
  .command("show")
  .argument("<id>", "معرف prompt")
  .option("--json", "JSON")
  .option("--spec", "أظهر PromptSpec المشتق")
  .action((idArg: string, opts: { json?: boolean; spec?: boolean }) => {
    const id = Number(idArg);
    if (!Number.isInteger(id) || id <= 0) {
      failLine("المعرف يجب أن يكون رقماً موجباً");
      process.exit(EXIT.USAGE);
    }
    const p = getPrompt(id);
    if (!p) {
      failLine(`لا يوجد prompt بالمعرف ${id}`);
      process.exit(EXIT.NOT_FOUND);
    }
    const spec = promptToSpec(p);
    if (opts.json) {
      out(JSON.stringify(opts.spec ? { spec } : { prompt: p }));
      return;
    }
    if (opts.spec) {
      out(JSON.stringify(spec, null, 2));
      return;
    }
    log(`${bold(p.title)}  #${p.id}  [${p.category}]  v${p.versions.length}`);
    if (p.subject) log(dim(`مادة: ${p.subject}`));
    if (p.tags.length) log(dim(`tags: ${p.tags.join(", ")}`));
    log("");
    log(p.body);
  });

promptCommand
  .command("validate")
  .argument("<id>", "معرف prompt أو --file")
  .option("--file <path>", "ملف PromptSpec JSON")
  .option("--json", "JSON")
  .action((idArg: string, opts: { file?: string; json?: boolean }) => {
    try {
      const id = Number(idArg);
      const spec = loadSpec(opts.file ? id || 0 : id, opts.file);
      promptSpecSchema.parse(spec);
      const rendered = renderPrompt(spec, Object.fromEntries(spec.variables.filter((v) => v.example).map((v) => [v.name, v.example!])));
      if (opts.json) {
        out(JSON.stringify({ ok: true, id: spec.id, version: spec.version, bytes: rendered.length }));
        return;
      }
      okLine(`PromptSpec صالح — #${spec.id} v${spec.version} (${rendered.length} حرف بعد render)`);
    } catch (e: any) {
      if (opts.json) {
        out(JSON.stringify({ ok: false, error: e?.message }));
        process.exit(EXIT.REFUSED);
      }
      failLine(e?.message ?? "validate failed");
      process.exit(EXIT.REFUSED);
    }
  });

promptCommand
  .command("render")
  .argument("<id>", "معرف prompt")
  .option("--file <path>", "ملف PromptSpec JSON")
  .option("--var <k=v...>", "قيمة متغير (متكرر)", (v: string, acc: string[]) => {
    acc.push(v);
    return acc;
  }, [] as string[])
  .action((idArg: string, opts: { file?: string; var?: string[] }) => {
    try {
      const spec = loadSpec(Number(idArg), opts.file);
      const inputs: Record<string, string> = {};
      for (const pair of opts.var ?? []) {
        const i = pair.indexOf("=");
        if (i <= 0) {
          failLine(`صيغة --var خاطئة: ${pair} (المتوقع name=value)`);
          process.exit(EXIT.USAGE);
        }
        inputs[pair.slice(0, i)] = pair.slice(i + 1);
      }
      const text = renderPrompt(spec, inputs);
      out(text);
    } catch (e: any) {
      failLine(e?.message ?? "render failed");
      process.exit(EXIT.REFUSED);
    }
  });

promptCommand
  .command("export")
  .option("--file <path>", "اكتب الحزمة إلى ملف")
  .action((opts: { file?: string }) => {
    const bundle = exportPrompts();
    const json = JSON.stringify(bundle, null, 2);
    if (opts.file) {
      fs.writeFileSync(opts.file, json, "utf8");
      okLine(`صُدّرت ${bundle.prompts.length} prompts → ${opts.file}`);
      return;
    }
    out(json);
  });

promptCommand
  .command("check-output")
  .argument("<id>", "معرف prompt")
  .requiredOption("--file <path>", "ملف الخرج markdown/json")
  .action((idArg: string, opts: { file: string }) => {
    const spec = loadSpec(Number(idArg));
    const output = fs.readFileSync(opts.file, "utf8");
    const res = checkOutputContract(spec, output);
    if (!res.ok) {
      for (const f of res.failures) failLine(f);
      process.exit(EXIT.REFUSED);
    }
    okLine("الخرج يحقق عقد الهيكل الأساسي");
  });
