/**
 * cli/commands/serve.ts — bridge to the Studio UI. Same projects/ store on
 * disk, so anything the CLI created is immediately visible in the browser.
 */

import fs from "node:fs";
import { spawn } from "node:child_process";
import * as process from "node:process";
import { Command } from "commander";
import { bold, okLine } from "../ui";

const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";

export const serveCommand = new Command("serve")
  .option("--port <port>", "المنفذ", "3000")
  .option("--dev", "شغّل وضع التطوير حتى لو وُجد بناء")
  .description("تشغيل الاستوديو على نفس مخزن المشاريع")
  .action((opts: { port: string; dev?: boolean }) => {
    const built = fs.existsSync(".next/BUILD_ID");
    const mode = built && !opts.dev ? "start" : "dev";
    okLine(`الاستوديو على ${bold(`http://localhost:${opts.port}`)} — ${mode === "start" ? "بناء الإنتاج" : "وضع التطوير"} (Ctrl+C للإيقاف)`);
    const child = spawn(npx, ["next", mode, "-p", opts.port], {
      stdio: "inherit",
      shell: isWin,
    });
    child.on("exit", (code) => process.exit(code ?? 0));
  });
