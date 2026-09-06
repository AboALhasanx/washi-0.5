/**
 * mcp/server.ts — Washi as an MCP (Model Context Protocol) server.
 *
 * The third integration layer (after the Studio UI and the CLI): agents that
 * speak MCP discover these tools and drive the exact same lib/* core the
 * Studio and CLI use — one core, three faces, zero duplicated semantics.
 *
 * Run:   npm run washi:mcp          (stdio transport — agents spawn this)
 * Tools: washi_new / washi_list / washi_show / washi_content_get /
 *        washi_content_set / washi_validate / washi_render / washi_snapshot /
 *        washi_restore / washi_publish / washi_packages / washi_verify /
 *        washi_trace / washi_delete
 *
 * Annotations tell the agent how each tool behaves (readOnly / destructive /
 * idempotent / openWorld) — mirroring docs/agents/README.md safety model.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createProject,
  deleteProject,
  listProjects,
  loadProject,
  loadPublication,
  publishProject,
  restoreSnapshot,
  saveProject,
  validateProject,
} from "../lib/project";
import { parseMarkdown } from "../lib/markdown-parser";
import { buildDocumentAst, buildAppContent } from "../lib/artifacts";
import { renderChapterPdf } from "../lib/render-pdf";
import fs from "node:fs";
import path from "node:path";

const CLOSED_WORLD = { openWorldHint: false as const };

/** Uniform tool result: human summary + machine JSON in one text block. */
function result(summary: string, data?: unknown, isError = false) {
  return {
    isError,
    content: [
      { type: "text" as const, text: data === undefined ? summary : `${summary}\n\n${JSON.stringify(data)}` },
    ],
  };
}

/** Map core errors to agent-readable failures (no stack traces, no paths). */
function failure(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  const hint = /لا يوجد مشروع|لا توجد حزمة|invalid project id/.test(message)
    ? "تحقق من المعرف عبر washi_list"
    : /frontmatter|مرفوض|صالح/.test(message)
      ? "راجع قواعد المحتوى في SKILL.md — ثم أصلح الملف وأعد المحاولة"
      : "أعد المحاولة؛ إن تكرر جرّب washi_validate";
  return result(`فشل — ${message}\n↳ ${hint}`, undefined, true);
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "washi", version: "1.5.0" });

  server.registerTool(
    "washi_list",
    {
      title: "سرد المشاريع",
      description: "List all Washi document projects (id, title, status, versions, publications).",
      inputSchema: {},
      annotations: { readOnlyHint: true, ...CLOSED_WORLD },
    },
    async () => {
      try {
        const projects = listProjects();
        return result(
          projects.length
            ? projects.map((p) => `${p.id} — ${p.title} [${p.status}] v${p.currentVersion} (${p.publicationCount} حزم)`).join("\n")
            : "لا مشاريع بعد",
          { projects },
        );
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_new",
    {
      title: "إنشاء مشروع",
      description:
        "Create a Washi project from a full chapter markdown string. Markdown MUST follow the washi contract: frontmatter (subject slug, quoted title, language, sources ≥1) + '# chapter title' + '## sections' + optional 'source:' comments. Returns the project id used by every other tool.",
      inputSchema: {
        title: z.string().min(1).describe("Chapter title (a safe slug id is derived from it)"),
        markdown: z.string().min(1).describe("Full chapter markdown following the washi contract"),
        subject: z.string().optional().describe("Subject slug override, e.g. computer-networks"),
        lang: z.enum(["ar", "en"]).optional().describe("Language (default ar)"),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, ...CLOSED_WORLD },
    },
    async ({ title, markdown, subject, lang }) => {
      try {
        const metadata = createProject({ title, subject, language: lang ?? "ar", markdown });
        return result(`أُنشئ المشروع: ${metadata.id}`, { project: metadata });
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_show",
    {
      title: "تفاصيل مشروع",
      description: "Project metadata + content statistics (sections, blocks, definitions, formulas).",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true, ...CLOSED_WORLD },
    },
    async ({ id }) => {
      try {
        const project = loadProject(id);
        const stats = buildDocumentAst(parseMarkdown(project.content).ast).stats;
        return result(`${project.metadata.title} — v${project.metadata.currentVersion}`, {
          metadata: project.metadata,
          stats,
        });
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_content_get",
    {
      title: "قراءة المحتوى",
      description: "Read the current content.md of a project (read this before editing).",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true, ...CLOSED_WORLD },
    },
    async ({ id }) => {
      try {
        const project = loadProject(id);
        return result(project.content, { content: project.content });
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_content_set",
    {
      title: "كتابة المحتوى",
      description:
        "Replace a project's content.md. The parser gate runs first — invalid manuscripts are refused (nothing is written). Get the current content via washi_content_get first.",
      inputSchema: {
        id: z.string().min(1),
        content: z.string().min(1).describe("Full replacement markdown (must pass the parser gate)"),
        snapshot: z.boolean().optional().describe("Also create a snapshot version (default false)"),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, ...CLOSED_WORLD },
    },
    async ({ id, content, snapshot }) => {
      try {
        const metadata = saveProject(id, { content, snapshotVersion: snapshot ?? false });
        return result(`حُفظ المحتوى — النسخة الحالية v${metadata.currentVersion}`, {
          currentVersion: metadata.currentVersion,
        });
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_validate",
    {
      title: "تحقق هيكلي",
      description: "Structural validation (components, math delimiters, sections). Non-ok results list every issue.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true, ...CLOSED_WORLD },
    },
    async ({ id }) => {
      try {
        const result_ = validateProject(id);
        const summary = result_.ok
          ? `صالح هيكلياً — ${result_.warnings} تحذير`
          : `${result_.errors} خطأ هيكلي — ${result_.warnings} تحذير`;
        return result(summary, result_, !result_.ok);
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_render",
    {
      title: "رندر PDF",
      description:
        "Render a fresh preview PDF + document.ast + app-content.json into an output dir. Preview artifact — not the frozen package.",
      inputSchema: {
        id: z.string().min(1),
        out: z.string().optional().describe("Output dir (default output/<id>)"),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, ...CLOSED_WORLD },
    },
    async ({ id, out }) => {
      try {
        const project = loadProject(id);
        const dir = path.resolve(out ?? path.join("output", project.metadata.id));
        fs.mkdirSync(dir, { recursive: true });
        const { pdf, ms } = await renderChapterPdf(project.content, project.template);
        fs.writeFileSync(path.join(dir, "document.pdf"), pdf);
        const { ast } = parseMarkdown(project.content);
        fs.writeFileSync(path.join(dir, "document.ast"), JSON.stringify(buildDocumentAst(ast), null, 2));
        fs.writeFileSync(path.join(dir, "app-content.json"), JSON.stringify(buildAppContent(ast), null, 2));
        return result(`تم الرندر في ${ms}ms → ${dir}`, { dir, pdfKb: +(pdf.length / 1024).toFixed(1), ms });
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_snapshot",
    {
      title: "لقطة",
      description: "Freeze a snapshot version of the current content + template.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: false, idempotentHint: false, ...CLOSED_WORLD },
    },
    async ({ id }) => {
      try {
        const metadata = saveProject(id, { snapshotVersion: true });
        return result(`أُنشئت النسخة v${metadata.currentVersion}`, {
          currentVersion: metadata.currentVersion,
        });
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_restore",
    {
      title: "استعادة نسخة",
      description: "Restore an old snapshot — becomes a NEW current version (history is append-only).",
      inputSchema: { id: z.string().min(1), version: z.number().int().positive() },
      annotations: { readOnlyHint: false, idempotentHint: false, ...CLOSED_WORLD },
    },
    async ({ id, version }) => {
      try {
        const metadata = restoreSnapshot(id, version);
        return result(`تمت الاستعادة من v${version} — الحالية v${metadata.currentVersion}`, {
          currentVersion: metadata.currentVersion,
        });
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_publish",
    {
      title: "نشر (تجميد)",
      description:
        "Publish = Freeze: an immutable Publication Package (content + AST + app-content + PDF + manifest with sha256 hashes + toolchain). Permanent and append-only. Refuses on structural errors.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, ...CLOSED_WORLD },
    },
    async ({ id }) => {
      try {
        const pub = await publishProject(id);
        return result(
          `نُشرت الحزمة v${pub.version} — غير قابلة للتعديل (${pub.manifest.hashes.contentSha256.slice(0, 12)}…)`,
          { version: pub.version, dir: pub.dir, hashes: pub.manifest.hashes },
        );
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_packages",
    {
      title: "الحزم المجمدة",
      description: "List frozen publication packages with hashes and toolchain info.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true, ...CLOSED_WORLD },
    },
    async ({ id }) => {
      try {
        const project = loadProject(id);
        const pubs = [];
        for (let v = 1; v <= project.metadata.publicationCount; v++) {
          try {
            const { manifest } = loadPublication(id, v);
            pubs.push(manifest);
          } catch {
            pubs.push({ version: v, missing: true });
          }
        }
        return result(`${pubs.length} حزمة`, { publications: pubs });
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_verify",
    {
      title: "تدقيق السلامة",
      description:
        "Integrity audit: recompute sha256 of frozen files vs the manifest. 'legacy' = published before hashes existed (republish to enable audit).",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true, ...CLOSED_WORLD },
    },
    async ({ id }) => {
      try {
        const project = loadProject(id);
        const results = [];
        for (let v = 1; v <= project.metadata.publicationCount; v++) {
          try {
            const { manifest } = loadPublication(id, v);
            const { createHash } = await import("node:crypto");
            const pubDir = path.join("projects", id, "publications", `v${v}`);
            if (!manifest.hashes?.contentSha256) {
              results.push({ version: v, status: "legacy" });
              continue;
            }
            const contentOk =
              createHash("sha256").update(fs.readFileSync(path.join(pubDir, "content.md"))).digest("hex") ===
              manifest.hashes.contentSha256;
            const pdfPath = path.join(pubDir, "document.pdf");
            const pdfOk =
              fs.existsSync(pdfPath) &&
              createHash("sha256").update(fs.readFileSync(pdfPath)).digest("hex") === manifest.hashes.pdfSha256;
            results.push({ version: v, status: contentOk && pdfOk ? "ok" : "mismatch" });
          } catch (e: any) {
            results.push({ version: v, status: "mismatch", error: e?.message });
          }
        }
        const ok = results.every((r) => r.status !== "mismatch");
        return result(
          ok ? "كل الحزم سليمة" : "تحذير: حزمة مخالفة — الحزمة المجمدة يجب ألا تتغير أبداً",
          { results },
          !ok,
        );
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_trace",
    {
      title: "نموذج الاستهلاك",
      description:
        "The platform-consumer read model: DocumentAST + app-content (concepts with provenance, flashcards, question candidates). Read the DRAFT by default; pass version to read a frozen publication.",
      inputSchema: { id: z.string().min(1), version: z.number().int().positive().optional() },
      annotations: { readOnlyHint: true, ...CLOSED_WORLD },
    },
    async ({ id, version }) => {
      try {
        let source: string;
        let documentAst: unknown;
        let appContent: unknown;
        if (version) {
          const pub = loadPublication(id, version);
          source = `publication v${version}`;
          documentAst = pub.documentAst;
          appContent = pub.appContent;
        } else {
          const project = loadProject(id);
          const { ast } = parseMarkdown(project.content);
          source = "live (current draft)";
          documentAst = buildDocumentAst(ast);
          appContent = buildAppContent(ast);
        }
        const ac = appContent as { stats: Record<string, number>; concepts: Array<{ term: string }> };
        return result(
          `تتبع (${source}) — مفاهيم: ${ac.concepts.map((c) => c.term).join("، ")}`,
          { source, documentAst, appContent },
        );
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "washi_delete",
    {
      title: "حذف مشروع",
      description:
        "DESTRUCTIVE: permanently delete a project with all snapshots and frozen packages. There is no undo. Prefer confirming with the user before calling.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, ...CLOSED_WORLD },
    },
    async ({ id }) => {
      try {
        loadProject(id);
        const gone = deleteProject(id);
        return result(gone ? `حُذف ${id} وكل مخطوطاته` : "تعذر الحذف", { deleted: gone }, !gone);
      } catch (e) {
        return failure(e);
      }
    },
  );

  return server;
}
