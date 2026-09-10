/**
 * tests/helpers.mjs — shared utilities for the Washi test suite.
 *
 * Design rules:
 *  - The CLI is always spawned as a REAL subprocess (no shell) so exit codes,
 *    stdout purity, and argv handling are exercised for real. Arabic args and
 *    em-dashes must survive, hence execFileSync instead of execSync.
 *  - Tests must not leak projects into projects/. Use track() + purge().
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** tsx runner — invoked via node directly to avoid npm arg-mangling. */
export const TSX = path.join("node_modules", "tsx", "dist", "cli.mjs");
export const MCP_STDIO = "mcp/stdio.ts";
export const CLI = "cli/washi.ts";

const DEFAULT_TIMEOUT = 300000;

/** Run the CLI; throw on non-zero exit. Returns stdout. */
export function washi(args, opts = {}) {
  return execFileSync("node", [TSX, CLI, ...args], {
    encoding: "utf8",
    input: opts.input ?? undefined,
    timeout: opts.timeout ?? DEFAULT_TIMEOUT,
  });
}

/** Run the CLI; never throws. Returns { code, out }. */
export function washiCode(args, opts = {}) {
  try {
    return { code: 0, out: washi(args, opts) };
  } catch (e) {
    return { code: e.status ?? -1, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

/** Run the CLI and parse stdout as JSON. */
export function washiJson(args, opts = {}) {
  return JSON.parse(washi(args, opts));
}

/** The committed sample chapter — the stable input for golden tests. */
export const SAMPLE_PATH = path.join("public", "samples", "computer-networks-ch1.md");
export const sampleMarkdown = () => fs.readFileSync(SAMPLE_PATH, "utf8");

/** Write markdown to a temp file (for --file ingestion tests). */
export function tempMarkdown(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "washi-test-"));
  const file = path.join(dir, "chapter.md");
  fs.writeFileSync(file, content, "utf8");
  return file;
}

export const projectDir = (id) => path.join("projects", id);
export const pubDir = (id, version) =>
  path.join("projects", id, "publications", `v${version}`);

/* ── project lifecycle hygiene ─────────────────────────────────────────────── */

const tracked = new Set();

/** Remember a project id so after() can remove it. */
export function track(id) {
  if (id) tracked.add(id);
  return id;
}

/** Delete every project whose id starts with `prefix` (leftover protection). */
export function purge(prefix) {
  try {
    const list = washiJson(["list", "--json"]);
    for (const p of list.projects ?? []) {
      if (p.id.startsWith(prefix)) {
        try {
          washi(["delete", p.id, "--yes"]);
        } catch {
          /* best effort */
        }
      }
    }
  } catch {
    /* list failed — nothing to purge */
  }
}

/** Best-effort cleanup of everything created during a test file. */
export function cleanupTracked() {
  for (const id of tracked) {
    try {
      washi(["delete", id, "--yes"]);
    } catch {
      /* best effort */
    }
  }
  tracked.clear();
}

/** Strip non-deterministic fields so artifacts can be compared byte-wise. */
export function normalize(value) {
  return JSON.parse(
    JSON.stringify(value, (key, v) => (key === "generatedAt" ? "<timestamp>" : v))
  );
}
