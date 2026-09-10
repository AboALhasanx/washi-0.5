/**
 * lib/project.ts
 * Washi 0.5 document-project store — filesystem-first.
 *
 * Project layout on disk:
 *
 *   projects/<id>/
 *   ├── content.md          (source of content — what the document says)
 *   ├── metadata.json       (what the system knows about the project)
 *   ├── template.json       (how it is presented — StudioTheme JSON)
 *   ├── assets/             (binary content / linked files)
 *   ├── snapshots/vN/       (important saves: content.md + template.json)
 *   └── publications/vN/    (immutable Publication Package)
 *
 * Presentation changes never rewrite content; publishing freezes.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import matter from "gray-matter";
import {
  documentMetadataSchema,
  frontmatterSchema,
  type DocumentMetadata,
  type DocumentStatus,
} from "./schemas";
import { mergeTheme, type StudioTheme } from "./theme";
import { parseMarkdown } from "./markdown-parser";
import { buildDocumentAst, buildAppContent, type DocumentAst, type AppContent } from "./artifacts";
import { validateMarkdown, type ValidationResult } from "./validate";
import { renderChapterPdf } from "./render-pdf";
import { WASHI_VERSION, AST_SCHEMA } from "./version";
import type { PublicationManifest } from "./schemas";

const ROOT = path.join(process.cwd(), "projects");

// Grammar every persisted project id must satisfy — ids arriving from URLs
// are validated against this, never sanitized/transformed.
const PROJECT_ID_RE = /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u;

/**
 * Generate a slug for a NEW project from a title (creation-time only).
 * Transformation is fine here; this is never a security boundary.
 */
const makeSafeId = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 64) || "project";

/**
 * Strict validation for an id arriving from outside (URL/body): must already
 * match the project-id grammar. Reject — never transform — so arbitrary
 * input cannot be mutated into a different valid project path.
 */
function assertValidProjectId(id: string): string {
  if (typeof id !== "string" || !PROJECT_ID_RE.test(id)) {
    throw new Error("invalid project id");
  }
  return id;
}

function ensureRoot() {
  fs.mkdirSync(ROOT, { recursive: true });
}

/**
 * sha256 of one file on disk. Every digest in a publication must be computed
 * from the bytes actually written, never from the in-memory string — otherwise
 * a re-encode on read (BOM, CRLF) would produce a false mismatch.
 */
function sha256File(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/**
 * Walk a publication root and hash every file below it.
 * Keys are posix-style relative paths so digests are comparable across
 * platforms (Windows would otherwise produce `assets\\x.png`).
 */
function collectArtifactHashes(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (rel: string) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) {
      for (const entry of fs.readdirSync(abs)) walk(rel ? `${rel}/${entry}` : entry);
      return;
    }
    out[rel.split(path.sep).join("/")] = sha256File(abs);
  };
  for (const entry of ["content.md", "document.ast", "app-content.json", "document.pdf", "assets", "metadata"]) {
    walk(entry);
  }
  return out;
}

/** Resolved takumi-pdf version — recorded in the publication manifest so any
 *  publication can be explained and reproduced with the same toolchain. */
function getTakumiVersion(): string {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "node_modules", "takumi-pdf", "package.json"), "utf8")
    ).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function projectDir(id: string) {
  const valid = assertValidProjectId(id);
  const dir = path.resolve(ROOT, valid);
  const rootResolved = path.resolve(ROOT);
  if (dir !== rootResolved && !dir.startsWith(rootResolved + path.sep)) {
    throw new Error("invalid project id");
  }
  return dir;
}

/* ─── CRUD ──────────────────────────────────────────────────────────────────── */

export interface CreateProjectInput {
  title: string;
  subject?: string;
  language?: "ar" | "en";
  markdown: string;
  template?: unknown;
}

export function createProject(input: CreateProjectInput): DocumentMetadata {
  ensureRoot();
  // Friendly import gate: the parser's frontmatter contract is strict by
  // design (provenance core — every chapter traces to a source), so surface
  // violations as actionable Arabic instead of raw Zod issue JSON.
  const fmCheck = frontmatterSchema.safeParse(matter(input.markdown).data);
  if (!fmCheck.success) {
    const bad = [...new Set(fmCheck.error.issues.map((i) => String(i.path[0] ?? "?")))];
    throw new Error(
      `استيراد مرفوض — الـ frontmatter ناقص أو غير صالح (${bad.join("، ")}). أضف subject/title/language/sources أعلى المستند.`
    );
  }
  // Parse up-front: a project cannot exist without structurally parseable
  // frontmatter (title/subject/language come from frontmatter when present).
  const { ast } = parseMarkdown(input.markdown);
  const fm = ast.frontmatter;

  let id = makeSafeId(input.title || fm.title || fm.subject);
  if (fs.existsSync(projectDir(id))) {
    id = `${id}-${Date.now().toString(36)}`;
  }

  // Validate the metadata record BEFORE touching the filesystem so a schema
  // failure never leaves an orphan project directory behind.
  const now = new Date().toISOString();
  const metadata: DocumentMetadata = documentMetadataSchema.parse({
    id,
    title: input.title || fm.title,
    subject: input.subject || fm.subject,
    language: input.language || fm.language,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    currentVersion: 1,
    publicationCount: 0,
  });

  const dir = projectDir(id);
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  fs.mkdirSync(path.join(dir, "snapshots"), { recursive: true });
  fs.mkdirSync(path.join(dir, "publications"), { recursive: true });

  fs.writeFileSync(path.join(dir, "content.md"), input.markdown, "utf8");
  fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
  const theme = mergeTheme(input.template ?? undefined);
  theme.id = id;
  fs.writeFileSync(path.join(dir, "template.json"), JSON.stringify(theme, null, 2), "utf8");

  // v1 snapshot = the imported draft
  snapshot(dir, 1);
  return metadata;
}

export function listProjects(): DocumentMetadata[] {
  ensureRoot();
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".trash-"))
    .map((d) => {
      try {
        return documentMetadataSchema.parse(
          JSON.parse(fs.readFileSync(path.join(ROOT, d.name, "metadata.json"), "utf8"))
        );
      } catch {
        return null;
      }
    })
    .filter(Boolean) as DocumentMetadata[];
}

export interface LoadedProject {
  metadata: DocumentMetadata;
  content: string;
  template: StudioTheme;
}

export function loadProject(id: string): LoadedProject {
  const dir = projectDir(id);
  // Check existence explicitly: the raw ENOENT message would leak server
  // filesystem paths into API error bodies and the UI error state.
  if (!fs.existsSync(path.join(dir, "metadata.json"))) {
    throw new Error("لا يوجد مشروع بهذا المعرف");
  }
  const metadata = documentMetadataSchema.parse(
    JSON.parse(fs.readFileSync(path.join(dir, "metadata.json"), "utf8"))
  );
  const content = fs.readFileSync(path.join(dir, "content.md"), "utf8");
  const template = mergeTheme(JSON.parse(fs.readFileSync(path.join(dir, "template.json"), "utf8")));
  return { metadata, content, template };
}

function writeMetadata(dir: string, metadata: DocumentMetadata) {
  fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
}

/* ─── Editing + snapshots ───────────────────────────────────────────────────── */

function snapshot(dir: string, version: number) {
  const vDir = path.join(dir, "snapshots", `v${version}`);
  fs.mkdirSync(vDir, { recursive: true });
  fs.copyFileSync(path.join(dir, "content.md"), path.join(vDir, "content.md"));
  fs.copyFileSync(path.join(dir, "template.json"), path.join(vDir, "template.json"));
}

export interface SaveProjectInput {
  content?: string;
  template?: unknown;
  /** create a named snapshot after saving (important save) */
  snapshotVersion?: boolean;
}

export function saveProject(id: string, input: SaveProjectInput): DocumentMetadata {
  const dir = projectDir(id);
  const metadata: DocumentMetadata = documentMetadataSchema.parse(
    JSON.parse(fs.readFileSync(path.join(dir, "metadata.json"), "utf8"))
  );

  if (typeof input.content === "string") {
    // content edits must still parse — structural gate before persisting
    parseMarkdown(input.content);
    fs.writeFileSync(path.join(dir, "content.md"), input.content, "utf8");
  }
  if (input.template !== undefined) {
    const theme = mergeTheme(input.template);
    fs.writeFileSync(path.join(dir, "template.json"), JSON.stringify(theme, null, 2), "utf8");
  }

  metadata.updatedAt = new Date().toISOString();
  if (input.snapshotVersion !== false) {
    metadata.currentVersion += 1;
    snapshot(dir, metadata.currentVersion);
  }
  writeMetadata(dir, metadata);
  return metadata;
}

export interface SnapshotInfo {
  version: number;
  at: string;
  bytes: number;
}

export function listSnapshots(id: string): SnapshotInfo[] {
  const dir = path.join(projectDir(id), "snapshots");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^v\d+$/.test(d.name))
    .map((d) => {
      const vDir = path.join(dir, d.name);
      const stat = fs.statSync(vDir);
      const bytes = fs
        .readdirSync(vDir)
        .reduce((s, f) => s + fs.statSync(path.join(vDir, f)).size, 0);
      return { version: parseInt(d.name.slice(1), 10), at: stat.mtime.toISOString(), bytes };
    })
    .sort((a, b) => a.version - b.version);
}

export function getSnapshot(id: string, version: number): { content: string; template: StudioTheme } {
  const vDir = path.join(projectDir(id), "snapshots", `v${version}`);
  return {
    content: fs.readFileSync(path.join(vDir, "content.md"), "utf8"),
    template: mergeTheme(JSON.parse(fs.readFileSync(path.join(vDir, "template.json"), "utf8"))),
  };
}

/** Restore = copy snapshot back, then snapshot the restored state as current+1. */
export function restoreSnapshot(id: string, version: number): DocumentMetadata {
  const snap = getSnapshot(id, version);
  return saveProject(id, { content: snap.content, template: snap.template });
}

/* ─── Validation ────────────────────────────────────────────────────────────── */

export function validateProject(id: string): ValidationResult {
  const dir = projectDir(id);
  const content = fs.readFileSync(path.join(dir, "content.md"), "utf8");
  const result = validateMarkdown(content, { assetsDir: path.join(dir, "assets") });
  const metadata: DocumentMetadata = documentMetadataSchema.parse(
    JSON.parse(fs.readFileSync(path.join(dir, "metadata.json"), "utf8"))
  );
  metadata.lastValidation = {
    at: new Date().toISOString(),
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
  };
  metadata.updatedAt = new Date().toISOString();
  writeMetadata(dir, metadata);
  return result;
}

/* ─── Publishing ────────────────────────────────────────────────────────────── */

export class PublishError extends Error {
  constructor(message: string, public validation?: ValidationResult) {
    super(message);
  }
}

export interface PublishResult {
  version: number;
  manifest: PublicationManifest;
  dir: string;
}

/**
 * Publish = Freeze. Runs the full pipeline (validate → parse → render →
 * package) and writes the immutable Publication Package. The author owns
 * the publish decision; once written the package is never edited.
 */
export async function publishProject(id: string): Promise<PublishResult> {
  const dir = projectDir(id);
  const metadata: DocumentMetadata = documentMetadataSchema.parse(
    JSON.parse(fs.readFileSync(path.join(dir, "metadata.json"), "utf8"))
  );
  if (metadata.status === "published") {
    // re-publishing creates a new immutable version — allowed, never edits old ones
  }

  const content = fs.readFileSync(path.join(dir, "content.md"), "utf8");
  const template = mergeTheme(JSON.parse(fs.readFileSync(path.join(dir, "template.json"), "utf8")));

  const validation = validateMarkdown(content, { assetsDir: path.join(dir, "assets") });
  if (!validation.ok) {
    throw new PublishError(
      `لا يمكن النشر — ${validation.errors} خطأ هيكلي. صحّح المستند أولاً.`,
      validation
    );
  }

  const { pdf, ast } = await renderChapterPdf(content, template);
  const documentAst = buildDocumentAst(ast);
  const appContent = buildAppContent(ast);

  const version = metadata.publicationCount + 1;
  const pubDir = path.join(dir, "publications", `v${version}`);
  if (fs.existsSync(pubDir)) {
    throw new PublishError(`publication v${version} موجودة مسبقاً — لا يجوز الكتابة فوق منشور`);
  }

  // Atomic publication (§ freeze): build the complete package in a temporary
  // sibling directory, verify every declared artifact, then rename. A crash
  // mid-publish can leave only a hidden temp dir — never a half publication.
  const tmpDir = path.join(dir, "publications", `.tmp-v${version}-${Date.now().toString(36)}`);
  try {
    fs.mkdirSync(path.join(tmpDir, "assets"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "metadata"), { recursive: true });

    fs.writeFileSync(path.join(tmpDir, "content.md"), content, "utf8");
    fs.writeFileSync(path.join(tmpDir, "document.ast"), JSON.stringify(documentAst, null, 2), "utf8");
    fs.writeFileSync(path.join(tmpDir, "app-content.json"), JSON.stringify(appContent, null, 2), "utf8");
    fs.writeFileSync(path.join(tmpDir, "document.pdf"), pdf);

    // assets snapshot — only files actually referenced stay honest; copy all
    const assetsDir = path.join(dir, "assets");
    if (fs.existsSync(assetsDir)) {
      for (const f of fs.readdirSync(assetsDir)) {
        fs.copyFileSync(path.join(assetsDir, f), path.join(tmpDir, "assets", f));
      }
    }

    // Every artifact must be on disk BEFORE hashing — including metadata.json,
    // which is why the publish instant is decided up front instead of being
    // taken from the manifest after the fact.
    const publishedAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(tmpDir, "metadata", "metadata.json"),
      JSON.stringify({ ...metadata, status: "published", publishedAt }, null, 2),
      "utf8"
    );
    fs.writeFileSync(
      path.join(tmpDir, "metadata", "template.json"),
      JSON.stringify(template, null, 2),
      "utf8"
    );

    // Package integrity gate (§11): every declared artifact must exist before
    // the directory earns its immutable name.
    const required = ["content.md", "document.ast", "app-content.json", "document.pdf", "assets", "metadata"];
    for (const f of required) {
      if (!fs.existsSync(path.join(tmpDir, f))) {
        throw new PublishError(`الحزمة غير مكتملة قبل التثبيت: ${f} مفقود`);
      }
    }

    // Full-artifact sealing: hash EVERY file in the package, not just
    // content.md + document.pdf. A package is only truly "sealed" when every
    // artifact it ships is covered — otherwise document.ast, app-content.json,
    // assets/ and metadata/ could be edited after publishing without verify()
    // ever noticing. manifest.json is the single excluded file: it carries the
    // digests and therefore cannot digest itself.
    const artifacts = collectArtifactHashes(tmpDir);

    const manifest: PublicationManifest = {
      version,
      publishedAt,
      title: metadata.title,
      subject: metadata.subject,
      language: metadata.language,
      templateId: template.id,
      contents: [
        "content.md",
        "document.ast",
        "app-content.json",
        "document.pdf",
        "assets/",
        "metadata/",
      ],
      validation: { ok: validation.ok, errors: validation.errors, warnings: validation.warnings },
      hashes: {
        artifacts,
        contentSha256: artifacts["content.md"],
        pdfSha256: artifacts["document.pdf"],
      },
      toolchain: {
        washi: WASHI_VERSION,
        schema: AST_SCHEMA,
        takumi: getTakumiVersion(),
      },
    };
    fs.writeFileSync(path.join(tmpDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

    fs.renameSync(tmpDir, pubDir);

    metadata.status = "published";
    metadata.publishedAt = manifest.publishedAt;
    metadata.publicationCount = version;
    metadata.updatedAt = manifest.publishedAt;
    writeMetadata(dir, metadata);

    return { version, manifest, dir: pubDir };
  } catch (e: any) {
    // never leave a partial package behind under a real version name
    try {
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    if (e instanceof PublishError) throw e;
    throw new PublishError(`فشل كتابة الحزمة: ${e?.message ?? String(e)}`);
  }
}

export interface PublicationSummary {
  version: number;
  publishedAt: string;
  title: string;
  dir: string;
}

export function listPublications(id: string): PublicationSummary[] {
  const dir = path.join(projectDir(id), "publications");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^v\d+$/.test(d.name))
    .map((d) => {
      const v = parseInt(d.name.slice(1), 10);
      const vDir = path.join(dir, d.name);
      let publishedAt = "";
      let title = "";
      try {
        const manifest = JSON.parse(fs.readFileSync(path.join(vDir, "manifest.json"), "utf8"));
        publishedAt = manifest.publishedAt;
        title = manifest.title;
      } catch {}
      return { version: v, publishedAt, title, dir: vDir };
    })
    .sort((a, b) => a.version - b.version);
}

/**
 * Read ONLY the manifest. Verification must not depend on the artifacts it is
 * about to check — otherwise deleting one of them throws and the audit
 * collapses into "missing" instead of naming the file that disappeared.
 */
export function loadManifest(id: string, version: number): PublicationManifest {
  const pubDir = path.join(projectDir(id), "publications", `v${version}`);
  const file = path.join(pubDir, "manifest.json");
  if (!fs.existsSync(file)) {
    throw new Error("لا توجد حزمة نشر بهذا الإصدار");
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as PublicationManifest;
}

export function loadPublication(id: string, version: number) {
  const pubDir = path.join(projectDir(id), "publications", `v${version}`);
  if (!fs.existsSync(path.join(pubDir, "manifest.json"))) {
    throw new Error("لا توجد حزمة نشر بهذا الإصدار");
  }
  const read = (f: string) => fs.readFileSync(path.join(pubDir, f), "utf8");
  return {
    manifest: JSON.parse(read("manifest.json")) as PublicationManifest,
    documentAst: JSON.parse(read("document.ast")) as DocumentAst,
    appContent: JSON.parse(read("app-content.json")) as AppContent,
  };
}

/* ─── Assets ────────────────────────────────────────────────────────────────── */

export function listAssets(id: string): string[] {
  const dir = path.join(projectDir(id), "assets");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile());
}

export function saveAsset(id: string, filename: string, data: Buffer): string {
  const safe = path.basename(filename).replace(/[^\p{L}\p{N}._-]/gu, "_");
  const dir = path.join(projectDir(id), "assets");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, safe);
  fs.writeFileSync(dest, data);
  return safe;
}

export function readAsset(id: string, filename: string): Buffer | null {
  const safe = path.basename(filename);
  const p = path.join(projectDir(id), "assets", safe);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

export function deleteProject(id: string): boolean {
  const dir = projectDir(id);
  if (!fs.existsSync(dir)) return false;
  // 1) Rename the tree out of its Unicode path first: rename works even
  //    while the OS holds open handles, and the ASCII tombstone name dodges
  //    the win32 rmSync silent no-op on non-ASCII paths.
  const tombstone = path.join(ROOT, `.trash-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
  let renamed = false;
  try {
    fs.renameSync(dir, tombstone);
    renamed = true;
  } catch {
    /* fall through to in-place removal */
  }
  // 2) Remove the (possibly renamed) tree, retrying via the shell.
  const target = renamed ? tombstone : dir;
  for (let attempt = 0; attempt < 4 && fs.existsSync(target); attempt++) {
    fs.rmSync(target, { recursive: true, force: true });
    if (fs.existsSync(target)) {
      try {
        execSync(`cmd /c rmdir /s /q "${target}"`, { stdio: "ignore" });
      } catch {
        /* best effort — the final check reports the truth */
      }
    }
  }
  // Success = the project is gone from its id. A .trash-* husk that the OS
  // still holds open is invisible to the projects list and not a project.
  return !fs.existsSync(dir);
}

/* ─── Interface-facing read/audit operations ─────────────────────────────────
 * The Studio (trace route), CLI, and MCP must all expose THE SAME semantics
 * for these — they live here once, and every interface calls them. */

export interface TraceModel {
  source: string;
  manifest: PublicationManifest | null;
  documentAst: DocumentAst;
  appContent: AppContent;
}

/** The platform-consumer read model: live draft by default, frozen
 *  publication vN when a version is given. */
export function buildTraceModel(id: string, version?: number): TraceModel {
  if (version !== undefined) {
    const { manifest, documentAst, appContent } = loadPublication(id, version);
    return { source: `publication v${version}`, manifest, documentAst, appContent };
  }
  const project = loadProject(id);
  const { ast } = parseMarkdown(project.content);
  return {
    source: "live (current draft)",
    manifest: null,
    documentAst: buildDocumentAst(ast),
    appContent: buildAppContent(ast),
  };
}

export type VerifyStatus = "ok" | "mismatch" | "legacy" | "missing";

/** Per-artifact outcome. `reason` distinguishes edited bytes from a deleted
 *  file — both are integrity failures but they mean different things. */
export interface VerifyArtifact {
  file: string;
  ok: boolean;
  reason?: "missing" | "changed";
}

export interface VerifyResult {
  version: number;
  status: VerifyStatus;
  /** Present whenever the manifest carries a full-artifact seal. */
  artifacts?: VerifyArtifact[];
  /** Kept for backward compatibility — derived from the artifact list. */
  contentOk?: boolean;
  pdfOk?: boolean;
  error?: string;
}

/**
 * Integrity audit of one frozen package: recompute sha256 of EVERY file the
 * manifest sealed and compare against the digests recorded at publish time.
 *
 * "legacy" = a package published before full-artifact sealing existed. It is
 * unverifiable, NOT tampered — it never claims "ok".
 */
export function verifyPublication(id: string, version: number): VerifyResult {
  try {
    const manifest = loadManifest(id, version);
    const hashes = (manifest as Partial<PublicationManifest>).hashes;
    if (!hashes?.contentSha256) return { version, status: "legacy" };

    const artifacts = hashes.artifacts;
    if (!artifacts || Object.keys(artifacts).length === 0) {
      return { version, status: "legacy" };
    }

    const pubDir = path.join(projectDir(id), "publications", `v${version}`);
    const results: VerifyArtifact[] = Object.entries(artifacts).map(([file, expected]) => {
      const abs = path.join(pubDir, file);
      if (!fs.existsSync(abs)) return { file, ok: false, reason: "missing" as const };
      const actual = sha256File(abs);
      return actual === expected ? { file, ok: true } : { file, ok: false, reason: "changed" as const };
    });

    const at = (file: string) => results.find((r) => r.file === file)?.ok;
    const ok = results.every((r) => r.ok);
    return {
      version,
      status: ok ? "ok" : "mismatch",
      artifacts: results,
      contentOk: at("content.md"),
      pdfOk: at("document.pdf"),
    };
  } catch (e: any) {
    return { version, status: "missing", error: e?.message };
  }
}

/** Manifests of every frozen publication (metadata.publicationCount is the
 *  authority; gaps in numbering are skipped). */
export function listPublicationManifests(id: string): PublicationManifest[] {
  const project = loadProject(id);
  const manifests: PublicationManifest[] = [];
  for (let v = 1; v <= project.metadata.publicationCount; v++) {
    try {
      manifests.push(loadManifest(id, v));
    } catch {
      /* gap in numbering — skip */
    }
  }
  return manifests;
}

/** Fresh preview render of the current draft: document.pdf + document.ast +
 *  app-content.json into an output dir. Preview artifact — publish is the
 *  freeze, these files are rewritten on every call. */
export async function renderPreviewToDir(
  id: string,
  outDir?: string
): Promise<{ dir: string; pdfPath: string; ms: number }> {
  const project = loadProject(id);
  const dir = path.resolve(outDir ?? path.join("output", project.metadata.id));
  fs.mkdirSync(dir, { recursive: true });
  const { pdf, ms } = await renderChapterPdf(project.content, project.template);
  const pdfPath = path.join(dir, "document.pdf");
  fs.writeFileSync(pdfPath, pdf);
  const { ast } = parseMarkdown(project.content);
  fs.writeFileSync(path.join(dir, "document.ast"), JSON.stringify(buildDocumentAst(ast), null, 2));
  fs.writeFileSync(path.join(dir, "app-content.json"), JSON.stringify(buildAppContent(ast), null, 2));
  return { dir, pdfPath, ms };
}
