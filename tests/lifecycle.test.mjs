/**
 * tests/lifecycle.test.mjs — project lifecycle through the shared core.
 *
 * Drives lib/project.ts directly (the same functions the Studio, CLI and MCP
 * all call) instead of going through a CLI subprocess, so the domain layer is
 * covered even if an interface regresses.
 *
 * Two tests below are deliberate CHANGE DETECTORS: they pin behaviour that the
 * roadmap is about to fix. When M1/M4 land, they will fail — that is the
 * signal to update them, not to delete them.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sampleMarkdown, projectDir, pubDir } from "./helpers.mjs";

const {
  createProject,
  saveProject,
  publishProject,
  verifyPublication,
  deleteProject,
  listSnapshots,
  restoreSnapshot,
  PublishError,
} = await import("../lib/project.ts");

const SAMPLE = sampleMarkdown();

const BROKEN = [
  "---",
  "subject: lifecycle-broken",
  'title: "فصل دورة حياة — مكسور"',
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

const created = [];

/** Ids this file owns — purged on start so repeated runs are idempotent
 *  (--test-force-exit can skip after() on a lingering handle). */
const OWN_PREFIXES = ["فصل-اختبار-دورة-الحياة", "فصل-مكسور-دورة-الحياة"];

function purgeOwn() {
  const root = "projects";
  if (!fs.existsSync(root)) return;
  for (const dir of fs.readdirSync(root)) {
    if (OWN_PREFIXES.some((p) => dir.startsWith(p))) {
      try {
        deleteProject(dir);
      } catch {
        /* best effort */
      }
    }
  }
}

/** Create a project and remember it for cleanup. */
function make(markdown, overrides = {}) {
  const meta = createProject({
    title: overrides.title ?? "فصل اختبار دورة الحياة",
    markdown,
  });
  created.push(meta.id);
  return meta;
}

before(() => {
  purgeOwn();
});

after(() => {
  for (const id of created) {
    try {
      deleteProject(id);
    } catch {
      /* best effort */
    }
  }
});

describe("create", () => {
  test("a new project starts at v1 with a v1 snapshot", () => {
    const meta = make(SAMPLE);
    assert.equal(meta.currentVersion, 1);
    assert.equal(meta.status, "draft");
    assert.equal(meta.publicationCount, 0);
    assert.ok(fs.existsSync(path.join(projectDir(meta.id), "snapshots", "v1", "content.md")));
  });

  test("content.md, metadata.json and template.json are written", () => {
    const meta = make(SAMPLE);
    for (const f of ["content.md", "metadata.json", "template.json"]) {
      assert.ok(fs.existsSync(path.join(projectDir(meta.id), f)), `${f} missing`);
    }
  });

  test("markdown without valid frontmatter is refused with an Arabic message", () => {
    assert.throws(
      () => createProject({ title: "بلا frontmatter", markdown: "## لا شيء" }),
      /frontmatter/
    );
  });
});

describe("save", () => {
  /* ⚠️ CHANGE DETECTOR — M4.1 will make saving NOT bump the version. */
  test("saving bumps currentVersion (current behaviour — see M4.1)", () => {
    const meta = make(SAMPLE);
    const after = saveProject(meta.id, { content: SAMPLE });
    assert.equal(after.currentVersion, meta.currentVersion + 1);
  });

  test("content that no longer parses is refused", () => {
    const meta = make(SAMPLE);
    assert.throws(() => saveProject(meta.id, { content: "## بلا frontmatter" }));
  });

  /* ⚠️ CHANGE DETECTOR — M4.2 will make restore produce one snapshot, not two. */
  test("restore produces an extra snapshot (current behaviour — see M4.2)", () => {
    const meta = make(SAMPLE);
    const before = listSnapshots(meta.id).length;
    restoreSnapshot(meta.id, 1);
    assert.equal(listSnapshots(meta.id).length, before + 1);
  });
});

describe("publish", () => {
  test("publishing freezes a complete package", async () => {
    const meta = make(SAMPLE);
    const res = await publishProject(meta.id);
    assert.equal(res.version, 1);
    for (const f of ["content.md", "document.ast", "app-content.json", "document.pdf", "manifest.json"]) {
      assert.ok(fs.existsSync(path.join(pubDir(meta.id, 1), f)), `${f} missing from package`);
    }
  });

  test("the manifest records hashes and toolchain", async () => {
    const meta = make(SAMPLE);
    const res = await publishProject(meta.id);
    assert.ok(res.manifest.hashes.contentSha256);
    assert.ok(res.manifest.hashes.pdfSha256);
    assert.equal(res.manifest.toolchain.schema, "washi.document-ast/0.5");
  });

  test("publishing a structurally invalid document throws PublishError", async () => {
    const meta = make(BROKEN, { title: "فصل مكسور دورة الحياة" });
    await assert.rejects(() => publishProject(meta.id), PublishError);
  });

  test("re-publishing creates a new version and never overwrites", async () => {
    const meta = make(SAMPLE);
    await publishProject(meta.id);
    const second = await publishProject(meta.id);
    assert.equal(second.version, 2);
    assert.ok(fs.existsSync(pubDir(meta.id, 1)));
    assert.ok(fs.existsSync(pubDir(meta.id, 2)));
  });
});

describe("verify", () => {
  test("a freshly published package verifies ok", async () => {
    const meta = make(SAMPLE);
    await publishProject(meta.id);
    const res = verifyPublication(meta.id, 1);
    assert.equal(res.status, "ok");
    assert.equal(res.contentOk, true);
    assert.equal(res.pdfOk, true);
  });

  test("tampering with frozen content.md is detected", async () => {
    const meta = make(SAMPLE);
    await publishProject(meta.id);
    const file = path.join(pubDir(meta.id, 1), "content.md");
    const original = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, original + "\n<!-- TAMPERED -->\n");
    try {
      const res = verifyPublication(meta.id, 1);
      assert.equal(res.status, "mismatch");
      assert.equal(res.contentOk, false);
    } finally {
      fs.writeFileSync(file, original);
    }
  });

  /* ⚠️ CHANGE DETECTOR — the M1 gap: only content.md and document.pdf are
   * hashed today, so tampering with app-content.json goes unnoticed. When M1
   * lands this MUST flip to "mismatch". This test is the acceptance proof. */
  test("tampering with app-content.json is currently NOT detected (M1 gap)", async () => {
    const meta = make(SAMPLE);
    await publishProject(meta.id);
    const file = path.join(pubDir(meta.id, 1), "app-content.json");
    const original = fs.readFileSync(file, "utf8");
    const mutated = JSON.parse(original);
    mutated.title = "TAMPERED";
    fs.writeFileSync(file, JSON.stringify(mutated, null, 2), "utf8");
    try {
      const res = verifyPublication(meta.id, 1);
      assert.equal(res.status, "ok", "M1 landed — flip this test to expect 'mismatch'");
    } finally {
      fs.writeFileSync(file, original);
    }
  });

  test("a missing publication reports 'missing'", () => {
    const meta = make(SAMPLE);
    assert.equal(verifyPublication(meta.id, 99).status, "missing");
  });
});
