/**
 * tests/cli.test.mjs — CLI contract acceptance suite.
 *
 * Migrated from scripts/cli-test.mjs. The CLI is spawned as a real process so
 * exit codes, stdout purity and argv handling are exercised for real.
 *
 * Tests are ordered: they drive one project through the full lifecycle
 * (new → validate → render → snapshot → publish → verify → trace → delete).
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  washi,
  washiCode,
  washiJson,
  sampleMarkdown,
  tempMarkdown,
  pubDir,
  track,
  cleanupTracked,
  purge,
} from "./helpers.mjs";

const SAMPLE = sampleMarkdown();

const BROKEN_BODY = [
  "---",
  "subject: cli-broken",
  'title: "فاصل اختبار CLI"',
  "language: ar",
  "sources:",
  "  - document: T.pdf",
  "    pages: [1]",
  "---",
  "",
  "## عنوان",
  "",
  "$$",
  "E = mc",
  "",
].join("\n");

const MAIN_PREFIX = "فصل-شبكات-اختبار-cli";
const BROKEN_PREFIX = "فاصل-اختبار-cli";

describe("CLI contract", () => {
  let id;
  let brokenId;

  before(() => {
    purge(MAIN_PREFIX);
    purge(BROKEN_PREFIX);
  });

  after(() => {
    cleanupTracked();
  });

  /* 1. version + usage */
  test("-V prints CLI version with exit 0", () => {
    assert.equal(washiCode(["-V"]).code, 0);
  });

  test("unknown command exits 3 (usage error)", () => {
    assert.equal(washiCode(["no-such-command"]).code, 3);
  });

  /* 2. the frontmatter gate refuses garbage with a friendly Arabic message */
  test("new without frontmatter exits 1 and explains why", () => {
    const r = washiCode(["new", "فاشل CLI"], { input: "## بلا frontmatter" });
    assert.equal(r.code, 1);
    assert.match(r.out, /frontmatter/);
  });

  /* 3. new from stdin — the AI handoff path */
  test("new from stdin exits 0 and derives an Arabic slug id", () => {
    const r = washiCode(["new", "فصل شبكات — اختبار CLI", "--subject", "computer-networks", "--json"], {
      input: SAMPLE,
    });
    assert.equal(r.code, 0, r.out.slice(0, 200));
    id = track(JSON.parse(r.out).project.id);
    assert.ok(id.startsWith(MAIN_PREFIX), `unexpected id: ${id}`);
  });

  /* 4. list + show --json */
  test("list --json contains the new project", () => {
    const list = washiJson(["list", "--json"]);
    assert.ok((list.projects ?? []).some((p) => p.id === id));
  });

  test("show --json reports section stats", () => {
    const show = washiJson(["show", id, "--json"]);
    assert.ok(show.stats?.sections >= 4, `sections=${show.stats?.sections}`);
  });

  /* 5. a structurally broken manuscript is importable but not publishable */
  test("broken-body project is created", () => {
    const file = tempMarkdown(BROKEN_BODY);
    const r = washiCode(["new", "فاصل اختبار CLI", "--file", file, "--json"]);
    assert.equal(r.code, 0, r.out.slice(0, 200));
    brokenId = track(JSON.parse(r.out).project.id);
  });

  test("validate on a broken body exits 1 and reports an error", () => {
    const r = washiCode(["validate", brokenId]);
    assert.equal(r.code, 1);
    assert.match(r.out, /خطأ/);
  });

  /* 6. render writes real artifacts */
  test("render writes document.pdf", () => {
    washi(["render", id]);
    assert.ok(fs.existsSync(path.join("output", id, "document.pdf")));
  });

  /* 7. snapshot + restore
   * ⚠️ CURRENT BEHAVIOUR (pre-M4): every save bumps currentVersion because
   * saveProject() treats an absent snapshotVersion as "true". These two
   * assertions are change-detectors — M4.1/M4.2 must update them. */
  test("snapshot bumps to v2", () => {
    const r = washiJson(["snapshot", id, "--json"]);
    assert.equal(r.currentVersion, 2);
  });

  test("restore v1 creates v3 (current behaviour — see M4.2)", () => {
    const r = washiJson(["restore", id, "1", "--json"]);
    assert.equal(r.currentVersion, 3);
  });

  /* 8. publish → verify → tamper → detect → undo */
  test("publish freezes v1 with content hash", () => {
    const pub = washiJson(["publish", id, "--yes", "--json"]);
    assert.equal(pub.version, 1);
    assert.ok(pub.manifest?.hashes?.contentSha256, "manifest is missing content hash");
  });

  test("verify on a fresh package exits 0 with status ok", () => {
    const r = washiCode(["verify", id, "--version", "1", "--json"]);
    assert.equal(r.code, 0, r.out.slice(0, 200));
    assert.equal(JSON.parse(r.out).results[0].status, "ok");
  });

  test("verify detects tampering of frozen content.md (exit 1)", () => {
    const file = path.join(pubDir(id, 1), "content.md");
    const original = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, original + "\n<!-- TAMPERED -->\n");
    try {
      const r = washiCode(["verify", id, "--version", "1"]);
      assert.equal(r.code, 1);
      assert.match(r.out, /مخالفة/);
    } finally {
      fs.writeFileSync(file, original);
    }
  });

  test("verify passes again after the tamper is undone", () => {
    assert.equal(washiCode(["verify", id, "--version", "1"]).code, 0);
  });

  /* 9. trace --json is the platform contract */
  test("trace --json exposes concepts and flashcards", () => {
    const trace = washiJson(["trace", id, "--version", "1", "--json"]);
    assert.ok((trace.appContent?.concepts?.length ?? 0) > 0);
    assert.ok((trace.appContent?.flashcards?.length ?? 0) > 0);
  });

  test("trace from a publication carries its source marker", () => {
    const trace = washiJson(["trace", id, "--version", "1", "--json"]);
    assert.equal(trace.source, "publication v1");
  });

  test("trace with a non-numeric version exits 3", () => {
    assert.equal(washiCode(["trace", id, "--version", "abc"]).code, 3);
  });

  test("verify with a non-numeric version exits 3", () => {
    assert.equal(washiCode(["verify", id, "--version", "abc"]).code, 3);
  });

  test("trace --json stdout is pure JSON with no diagnostics", () => {
    const raw = washi(["trace", id, "--version", "1", "--json"]);
    assert.ok(raw.trim().startsWith("{"), "stdout is not pure JSON");
    assert.ok(!raw.includes("تتبع"), "stdout leaked human diagnostics");
  });

  /* 9d. multi-package publish + whole-history verification */
  test("a second publish freezes v2", () => {
    const pub2 = washiJson(["publish", id, "--yes", "--json"]);
    assert.equal(pub2.version, 2);
    assert.ok(pub2.manifest?.hashes?.contentSha256);
  });

  test("verify without --version audits both v1 and v2", () => {
    const r = washiCode(["verify", id, "--json"]);
    assert.equal(r.code, 0, r.out.slice(0, 200));
    const results = JSON.parse(r.out).results;
    assert.equal(results.length, 2);
    assert.ok(results.every((x) => x.status === "ok"));
  });

  /* 10. not found */
  test("show on a nonexistent project exits 2", () => {
    assert.equal(washiCode(["show", "لا-يوجد-مطلقاً-xyz"]).code, 2);
  });

  /* 11. delete requires consent */
  test("delete without --yes refuses (exit 1) in non-TTY", () => {
    assert.equal(washiCode(["delete", id]).code, 1);
  });

  test("delete --yes exits 0", () => {
    assert.equal(washiCode(["delete", id, "--yes"]).code, 0);
  });

  test("deleted project disappears from list", () => {
    const list = washiJson(["list", "--json"]);
    assert.ok(!(list.projects ?? []).some((p) => p.id === id));
  });
});
