/**
 * cli/shared.ts — helpers every command shares.
 * The CLI is a presentation layer over lib/*: it maps terminal input to core
 * calls and core results/errors to terminal output + exit codes. Nothing here
 * touches the filesystem except through lib/*.
 */

import fs from "node:fs";
import { createHash } from "node:crypto";
import * as process from "node:process";
import { EXIT, failLine, log } from "./ui";
import { loadProject } from "../lib/project";
import type { LoadedProject } from "../lib/project";

/** Load a project or terminate with the canonical NOT_FOUND exit code. */
export function mustLoadProject(id: string): LoadedProject {
  try {
    return loadProject(id);
  } catch (e: any) {
    failLine(e?.message ?? String(e));
    process.exit(EXIT.NOT_FOUND);
  }
}

/** Read all of stdin (used by `new` when no --file is given). */
export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

/** Whether --json was requested on this invocation. */
export function wantsJson(opts: Record<string, unknown>): boolean {
  return Boolean(opts.json);
}

/** sha256 of a file on disk — used by `verify` against the frozen manifest. */
export function sha256File(p: string): string {
  return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

/** Human summary of structural issues (shared by validate + publish refusal). */
export function printIssues(issues: Array<{ severity: string; message: string; line?: number }>): void {
  for (const i of issues) {
    log(`  ${i.severity === "error" ? "✗" : "▲"} ${i.line ? `سطر ${i.line} — ` : ""}${i.message}`);
  }
}

export function hint(s: string): void {
  log(`  ${"↳"} ${s}`);
}

export { log };
