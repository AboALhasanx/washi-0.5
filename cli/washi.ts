/**
 * cli/washi.ts — Washi CLI entry point.
 *
 * A presentation layer over lib/* (the same core the Studio uses): terminal
 * input → core calls → terminal output + semantic exit codes. Run via:
 *   npm run washi -- <command>
 */

import * as process from "node:process";
import { Command, CommanderError } from "commander";
import { EXIT, bold, dim, failLine, log, setColorEnabled } from "./ui";

import { newCommand } from "./commands/new";
import { listCommand } from "./commands/list";
import { showCommand } from "./commands/show";
import { validateCommand } from "./commands/validate";
import { renderCommand } from "./commands/render";
import { snapshotCommand } from "./commands/snapshot";
import { restoreCommand } from "./commands/restore";
import { publishCommand } from "./commands/publish";
import { packagesCommand } from "./commands/packages";
import { verifyCommand } from "./commands/verify";
import { traceCommand } from "./commands/trace";
import { deleteCommand } from "./commands/delete";
import { editCommand } from "./commands/edit";
import { serveCommand } from "./commands/serve";
import { demoCommand } from "./commands/demo";

const program = new Command();

program
  .name("washi")
  .description("واشي — الناشر التعليمي المحلي: Markdown → حزمة نشر مجمّدة قابلة للتتبع")
  // --version stays free for subcommands (e.g. `washi verify <id> --version N`)
  .version("1.5.0", "-V, --cli-version", "إصدار الـ CLI نفسه")
  .option("--no-color", "تعطيل الألوان")
  .showHelpAfterError(dim("جرّب washi --help"))
  .exitOverride()
  .addHelpText(
    "after",
    `\n${bold("أمثلة")}\n  $ cat ch1.md | npm run washi -- new "الفصل الأول" --subject computer-networks\n  $ npm run washi -- validate الفصل-الأول\n  $ npm run washi -- publish الفصل-الأول --yes\n  $ npm run washi -- trace الفصل-الأول --json | jq .appContent.stats\n`,
  );

program.addCommand(newCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(validateCommand);
program.addCommand(renderCommand);
program.addCommand(snapshotCommand);
program.addCommand(restoreCommand);
program.addCommand(publishCommand);
program.addCommand(packagesCommand);
program.addCommand(verifyCommand);
program.addCommand(traceCommand);
program.addCommand(deleteCommand);
program.addCommand(editCommand);
program.addCommand(serveCommand);
program.addCommand(demoCommand);

// --no-color is a global option; apply it before command handlers run
program.hook("preAction", (_thisCommand, actionCommand) => {
  const noColor = actionCommand.opts().color === false;
  setColorEnabled(!noColor && process.env.NO_COLOR === undefined && process.stdout.isTTY === true);
});

program.parseAsync(process.argv).catch((e: unknown) => {
  if (e instanceof CommanderError) {
    // usage problems (unknown command/option, missing args) + --help/--version
    if (e.code === "commander.help" || e.code === "commander.version") process.exit(EXIT.OK);
    process.exit(EXIT.USAGE);
  }
  const message = e instanceof Error ? e.message : String(e);
  // Core error vocabulary → semantic exit codes (docs/cli/design.md §7)
  const notFound = /لا يوجد مشروع|لا توجد حزمة|invalid project id/.test(message);
  if (notFound) {
    failLine(message);
    process.exit(EXIT.NOT_FOUND);
  }
  // logical refusals from the core (import gate, parser gates, publish rules)
  const refused =
    /^استيراد مرفوض|^الـ frontmatter ناقص|^بنية المستند غير مطابقة|غير قابلة للتعديل|مرفوض/.test(message);
  if (refused) {
    failLine(message);
    process.exit(EXIT.REFUSED);
  }
  failLine(`خطأ غير متوقع — ${message}`);
  log(dim("  إن تكرر، ارفع المشكلة مع نص الأمر ورسالة الخطأ"));
  process.exit(EXIT.UNEXPECTED);
});
