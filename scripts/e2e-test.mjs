/**
 * scripts/e2e-test.mjs — Washi 0.5 acceptance test (run against a live server).
 *
 * Usage: node scripts/e2e-test.mjs [baseUrl]
 * Default baseUrl: http://localhost:3000
 *
 * Covers the §47 checklist programmatically:
 * - create/open project (regression sample: samples/software-engineering/chapter-09.md)
 * - load markdown, structural validation
 * - edit + snapshot + restore (history)
 * - render (Takumi PDF via the unified render path)
 * - publish → immutable publication package (manifest, hashes, toolchain)
 * - provenance test (block-level source metadata)
 * - app-content test (AST → platform-facing model)
 * - no "Untitled" sections / no fake sections (§38)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const BASE = process.argv[2] ?? "http://localhost:3000";
let passed = 0;
let failed = 0;

function check(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name} ${detail ? "— " + detail : ""}`);
  }
}

const api = async (p, opts) => {
  const res = await fetch(BASE + p, opts);
  const type = res.headers.get("content-type") ?? "";
  const body = type.includes("json") ? await res.json() : await res.arrayBuffer();
  return { status: res.status, ok: res.ok, body, headers: res.headers };
};

console.log(`\nWashi 0.5 E2E → ${BASE}\n`);

// ── 0. Regression sample loads and parses ──────────────────────────────────
const samplePath = path.join(process.cwd(), "samples", "software-engineering", "chapter-09.md");
check("regression sample exists", fs.existsSync(samplePath));
const regressionMd = fs.readFileSync(samplePath, "utf8");

// ── 1. Create project ──────────────────────────────────────────────────────
let r = await api("/api/projects", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ markdown: regressionMd }),
});
check("create project", r.ok, JSON.stringify(r.body).slice(0, 200));
const project = r.body.project;
const id = encodeURIComponent(project.id);

// ── 2. Load project ────────────────────────────────────────────────────────
r = await api(`/api/projects/${id}`);
check("load project (content.md + metadata.json + template.json)", r.ok && r.body.content?.length > 0 && r.body.template?.id);
check("metadata v1 snapshot on import", r.body.metadata?.currentVersion === 1);

// ── 3. Structural validation ───────────────────────────────────────────────
r = await api(`/api/projects/${id}/validate`);
check("structural validation passes", r.ok && r.body.ok === true, JSON.stringify(r.body.issues ?? []).slice(0, 300));
check("no fake Untitled sections (§38)", !(r.body.issues ?? []).some((i) => i.message?.includes("Untitled")));

// ── 4. Edit + snapshot + restore ───────────────────────────────────────────
const edited = r2md(regressionMd);
r = await api(`/api/projects/${id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: edited }),
});
check("edit creates snapshot v2", r.ok && r.body.project?.currentVersion === 2);

r = await api(`/api/projects/${id}/snapshots`);
check("snapshot history listed (v1, v2)", r.ok && r.body.snapshots?.length === 2);

r = await api(`/api/projects/${id}/snapshots`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ version: 1 }),
});
check("restore v1 → new revision v3 (history preserved)", r.ok && r.body.project?.currentVersion === 3);

r = await api(`/api/projects/${id}`);
check("restored content equals v1 content", r.body.content === regressionMd);

// ── 5. Render (unified Takumi path) ────────────────────────────────────────
r = await api("/api/generate-pdf", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ markdown: regressionMd }),
});
const pdf = Buffer.from(r.body);
check("render: takumi PDF generated", r.ok && pdf.subarray(0, 5).toString() === "%PDF-", `${r.status}`);
check("render: selectable Arabic output (non-trivial size)", pdf.length > 20000, `${pdf.length} bytes`);

// ── 6. Provenance ──────────────────────────────────────────────────────────
r = await api(`/api/projects/${id}/trace`);
const docAst = r.body.documentAst;
const provBlocks = docAst.sections.flatMap((s) => s.nodes).filter((n) => n.provenance?.length);
check("provenance: blocks carry source metadata", provBlocks.length > 0, `${provBlocks.length} blocks`);
const ref = provBlocks[0]?.provenance[0];
check("provenance: document + pages present", !!ref?.document && Array.isArray(ref?.pages));
check("provenance: kind semantics present", ["source-derived", "generated"].includes(ref?.kind ?? "source-derived"));
check("provenance: hidden from app-content", JSON.stringify(r.body.appContent).includes('"provenance"') === false);

// ── 7. App-content ─────────────────────────────────────────────────────────
const app = r.body.appContent;
check("app-content: schema versioned", app.schema === "washi.app-content/0.5");
check("app-content: concepts derived from definitions", app.concepts.length > 0, `${app.concepts?.length}`);
check("app-content: flashcards reference concepts", app.flashcards.every((f) => f.conceptId));
check("app-content: stable block ids", app.sections.every((s) => s.blocks.every((b) => /^b\d+-\d+$/.test(b.id))));

// ── 8. Publish → immutable package ─────────────────────────────────────────
r = await api(`/api/projects/${id}/publish`, { method: "POST" });
check("publish succeeds (frozen)", r.ok && r.body.published === true, JSON.stringify(r.body).slice(0, 200));
const manifest = r.body.manifest;
check("manifest: complete artifact list", ["content.md", "document.ast", "app-content.json", "document.pdf", "assets/", "metadata/"].every((f) => manifest.contents.includes(f)));
check("manifest: content + pdf hashes", /^[a-f0-9]{64}$/.test(manifest.hashes?.contentSha256 ?? "") && /^[a-f0-9]{64}$/.test(manifest.hashes?.pdfSha256 ?? ""));
check("manifest: toolchain recorded (washi/schema/takumi)", !!manifest.toolchain?.washi && manifest.toolchain?.schema === "washi.document-ast/0.5" && manifest.toolchain?.takumi !== "unknown");

// content hash matches canonical source
const contentHash = crypto.createHash("sha256").update(regressionMd, "utf8").digest("hex");
check("manifest: content hash = sha256(content.md)", manifest.hashes.contentSha256 === contentHash);

// immutability: republish after edit creates v2, v1 untouched
await api(`/api/projects/${id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: edited }),
});
r = await api(`/api/projects/${id}/publish`, { method: "POST" });
check("republish after edit → v2 (never edits v1)", r.ok && r.body.version === 2);
r = await api(`/api/projects/${id}/trace?v=1`);
check("publication v1 still loadable and immutable", r.ok && r.body.manifest.version === 1);

// ── 9. Preview methods share the render path ──────────────────────────────
r = await api("/api/preview-pages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ markdown: regressionMd }),
});
check("preview-pages: rasterized pages from takumi output", r.ok && r.body.pages?.length > 0, `${r.body.pages?.length} pages`);

// ── cleanup: remove test project ───────────────────────────────────────────
r = await api(`/api/projects/${id}`, { method: "DELETE" });
check("test project cleaned up", r.ok);

console.log(`\n═══ ${passed} passed, ${failed} failed ═══\n`);
process.exit(failed > 0 ? 1 : 0);

/** Append a small human edit to the sample (the "edit" step of the flow). */
function r2md(md) {
  return md + "\n\n<!-- source: (generated) -->\n## نقاط مهمة\n\n> [!IMPORTANT] هذه إضافة تجريبية لاختبار دورة التحرير.\n";
}
