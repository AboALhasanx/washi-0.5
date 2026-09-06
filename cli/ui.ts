/**
 * cli/ui.ts — terminal presentation layer for the Washi CLI.
 * Colors degrade automatically: TTY detection, NO_COLOR, --no-color.
 * stdout carries results; every progress/log line goes to stderr.
 */

import * as process from "node:process";

/** Semantic exit codes — part of the CLI's contract (see docs/cli/design.md §7). */
export const EXIT = {
  OK: 0,
  REFUSED: 1, // logical refusal: validation failed, publish blocked, verify mismatch
  NOT_FOUND: 2,
  USAGE: 3,
  UNEXPECTED: 4,
} as const;

let colorEnabled =
  process.stdout.isTTY === true && !process.env.NO_COLOR && process.env.TERM !== "dumb";

export function setColorEnabled(on: boolean) {
  colorEnabled = on;
}

export function colorEnabledNow(): boolean {
  return colorEnabled;
}

const wrap = (code: string, s: string) => (colorEnabled ? `\x1b[${code}m${s}\x1b[0m` : s);

export const bold = (s: string) => wrap("1", s);
export const dim = (s: string) => wrap("2", s);
export const red = (s: string) => wrap("31", s);
export const green = (s: string) => wrap("32", s);
export const amber = (s: string) => wrap("33", s);
export const accent = (s: string) => wrap("36", s);

/** results → stdout (the only stream `--json` consumers should read) */
export function out(s = ""): void {
  process.stdout.write(s + "\n");
}

/** progress / logs / errors → stderr */
export function log(s = ""): void {
  process.stderr.write(s + "\n");
}

export function okLine(s: string): void {
  log(green(`✓ ${s}`));
}
export function failLine(s: string): void {
  log(red(`✗ ${s}`));
}
export function infoLine(s: string): void {
  log(accent(`▸ ${s}`));
}
export function hrule(width = 64): void {
  log(dim("─".repeat(width)));
}

/** truncate long single-line values for table cells */
export function cell(s: string, width: number): string {
  return s.length <= width ? s : s.slice(0, width - 1) + "…";
}

/**
 * Minimal aligned table. Widths are computed per column; we deliberately do
 * NOT right-pad the last column (RTL terminal rendering is cleaner that way).
 */
export function table(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length))
  );
  const line = (cells: string[], paint?: (s: string) => string) =>
    cells
      .map((c, i) => {
        const v = (c ?? "").padEnd(widths[i], " ");
        return paint ? paint(v) : v;
      })
      .join(dim("  │  "));
  log(line(headers, (s) => bold(dim(s))));
  log(dim("─".repeat(widths.reduce((a, w) => a + w, 0) + (widths.length - 1) * 5)));
  for (const r of rows) log(line(r));
}
