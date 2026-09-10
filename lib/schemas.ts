import { z } from "zod";

/**
 * Schemas for Washi — validates structured Markdown frontmatter
 * and ChapterAST.
 *
 * Frontmatter required: subject, title, language, sources[]
 * (theme is DEPRECATED — presentation belongs exclusively to template.json;
 * the field is accepted for backward compatibility with existing content and
 * ignored by the renderer.)
 * ChapterAST: finite vocabulary mapped to pdfcn components via KeepTogether etc.
 */

// ── Frontmatter ──────────────────────────────────────────────────────────────

export const sourceEntrySchema = z.object({
  document: z.string().min(1, "document filename required, e.g., Computer Networks.pdf"),
  pages: z
    .array(z.number().int().positive())
    .min(1, "at least one page number required")
    .max(20, "pages array too long — use a range instead"),
  chapter: z.string().optional(),
});

export type SourceEntry = z.infer<typeof sourceEntrySchema>;

export const frontmatterSchema = z.object({
  subject: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "subject يجب أن يكون slug بحروف صغيرة وأرقام، مثل computer-networks"
    ),
  // DEPRECATED (§6 no competing presentation sources): kept optional so legacy
  // content still parses. The renderer never reads it — template.json is the
  // only presentation authority.
  theme: z
    .literal("default", { errorMap: () => ({ message: "theme ملغى رسمياً — احذفه من الـ frontmatter (العرض من template.json)" }) })
    .optional()
    .describe("DEPRECATED — ignored; presentation lives in template.json"),
  title: z.string().min(1, "عنوان الفصل مطلوب"),
  language: z.enum(["ar", "en"], {
    errorMap: () => ({ message: "language يجب أن يكون ar أو en" }),
  }),
  sources: z.array(sourceEntrySchema).min(1, "مطلوب مصدر واحد على الأقل — كل معلومة تُتتبع لوثيقة"),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

// ── ChapterAST — finite vocabulary → pdfcn composition ────────────────────
// See specs/pdfcn-components-catalog.md (corrected) and markdown-schema-spec.md

export const calloutVariantSchema = z.enum(["NOTE", "IMPORTANT", "WARNING", "EXAMPLE", "TIP"]);

// ── Provenance (Washi 0.5) ──────────────────────────────────────────────────
// Hidden per-block source tracing, Admin/Debug views only. Derived from
// <!-- source: Doc.pdf p.142 --> comments; a block may carry multiple refs.
// paragraphs/regions granularity is accepted but never invented by the parser.

export const provenanceRefSchema = z
  .object({
    document: z.string().min(1).optional(),
    pages: z.array(z.number().int().positive()).optional(),
    paragraphs: z.array(z.number().int().positive()).optional(),
    regions: z.array(z.string()).optional(),
    // §21 provenance semantics: where the block's content came from. The parser
    // only derives "source-derived" (or explicit "(generated)" markers); a
    // human edit workflow may later mark "edited"/"authored". Never invented.
    kind: z.enum(["source-derived", "generated", "authored", "edited"]).optional(),
  })
  .refine((v) => !!v.document || !!v.kind, {
    message: "provenance ref needs a source document or an explicit kind",
  });

export type ProvenanceRef = z.infer<typeof provenanceRefSchema>;

export const headingNodeSchema = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().min(1),
  // optional source traceability comment attached to section
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
});

export const paragraphNodeSchema = z.object({
  type: z.literal("paragraph"),
  text: z.string().min(1),
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
});

export const calloutNodeSchema = z.object({
  type: z.literal("callout"),
  variant: calloutVariantSchema,
  // markdown: > [!IMPORTANT] ... → Alert variant
  title: z.string().optional(),
  content: z.string().min(1),
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
});

export const definitionNodeSchema = z.object({
  type: z.literal("definition"),
  term: z.string().min(1),
  definition: z.string().min(1),
  variant: z.literal("NOTE").default("NOTE"),
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
});

export const formulaNodeSchema = z.object({
  type: z.literal("formula"),
  // LaTeX preserved exactly — inline $...$ or block $$...$$
  latex: z.string().min(1),
  displayMode: z.boolean().default(true).describe("true = $$ block, false = $ inline"),
  caption: z.string().optional().describe("Arabic explanation after LaTeX when language=ar"),
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
});

export const tableNodeSchema = z.object({
  type: z.literal("table"),
  // Standard Markdown | pipes → DataTable / Table
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).min(1),
  caption: z.string().optional(),
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
});

export const figureNodeSchema = z.object({
  type: z.literal("figure"),
  // ![alt](src) + *caption* — binary extraction deferred for MVP1
  src: z.string().min(1),
  alt: z.string().min(1, "alt required"),
  caption: z.string().min(1, "caption required"),
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
});

export const codeBlockNodeSchema = z.object({
  type: z.literal("code"),
  language: z.string().optional(),
  code: z.string().min(1),
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
});

export const listNodeSchema = z.object({
  type: z.literal("list"),
  ordered: z.boolean().default(false),
  items: z.array(z.string().min(1)).min(1),
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
});

export const sourceCommentNodeSchema = z.object({
  type: z.literal("source"),
  // <!-- source: Textbook.pdf p.142 -->
  raw: z.string().min(1),
  document: z.string().optional(),
  pages: z.array(z.number().int().positive()).optional(),
});

export const astNodeSchema = z.discriminatedUnion("type", [
  headingNodeSchema,
  paragraphNodeSchema,
  calloutNodeSchema,
  definitionNodeSchema,
  formulaNodeSchema,
  tableNodeSchema,
  figureNodeSchema,
  codeBlockNodeSchema,
  listNodeSchema,
  sourceCommentNodeSchema,
]);

export type AstNode = z.infer<typeof astNodeSchema>;
export type HeadingNode = z.infer<typeof headingNodeSchema>;
export type CalloutNode = z.infer<typeof calloutNodeSchema>;
export type FormulaNode = z.infer<typeof formulaNodeSchema>;
export type TableNode = z.infer<typeof tableNodeSchema>;
export type FigureNode = z.infer<typeof figureNodeSchema>;

// Section — ordered 7-section structure (Review optional)
export const sectionNameSchema = z.enum([
  "overview", // 1. Overview / نظرة عامة
  "core-concepts", // 2. Core Concepts / المفاهيم الأساسية
  "definitions", // 3. Definitions / التعاريف
  "formulas", // 4. Formulas / المعادلات
  "worked-examples", // 5. Worked Examples / أمثلة محلولة
  "key-points", // 6. Important Callouts / نقاط مهمة
  "review", // 7. Review Questions / أسئلة مراجعة (optional)
  "custom", // fallback for additional ## sections (e.g., comparison tables)
]);

export const chapterSectionSchema = z.object({
  name: sectionNameSchema,
  heading: z.string().min(1).describe("Section heading text, e.g., نظرة عامة / Overview"),
  nodes: z.array(astNodeSchema).min(1),
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
});

export type ChapterSection = z.infer<typeof chapterSectionSchema>;

// Root AST
export const chapterASTSchema = z.object({
  frontmatter: frontmatterSchema,
  // Raw markdown preserved for regenerability (PDF is artifact)
  rawMarkdown: z.string().min(1),
  sections: z.array(chapterSectionSchema).min(1).describe("At least 1 section; ideally 6-7 per spec"),
  // Flat node list for mapper convenience (alternative view)
  nodes: z.array(astNodeSchema).optional(),
  // File path convention: content/<subject>/chapter-XX.md
  filePath: z.string().optional(),
});

export type ChapterAST = z.infer<typeof chapterASTSchema>;

// ── Validation helpers ─────────────────────────────────────────────────────

export function parseFrontmatter(data: unknown): Frontmatter {
  return frontmatterSchema.parse(data);
}

export function safeParseFrontmatter(data: unknown) {
  return frontmatterSchema.safeParse(data);
}

export function parseChapterAST(data: unknown): ChapterAST {
  return chapterASTSchema.parse(data);
}

export function safeParseChapterAST(data: unknown) {
  return chapterASTSchema.safeParse(data);
}

// Allowed pdfcn compositions — mapper must reject invented types
export const ALLOWED_NODE_TYPES = [
  "heading",
  "paragraph",
  "callout",
  "definition",
  "formula",
  "table",
  "figure",
  "code",
  "list",
  "source",
] as const;

export const MAP_MARKDOWN_TO_PDFCN: Record<AstNode["type"], string> = {
  heading: "Heading (L1→Section+PageBreak, L2/L3→Heading)",
  paragraph: "Text",
  callout: "KeepTogether(Alert variant)",
  definition: "KeepTogether(Card(Heading+Text))",
  formula: "KeepTogether(Card(PdfImage))",
  table: "DataTable / Table (ComparisonTable)",
  figure: "KeepTogether(PdfImage+Text caption)",
  code: "KeepTogether(Card(Text monospace))",
  list: "List",
  source: "Text (small, muted) / KeyValue",
};

// ── Washi 0.5 — Document Project (WASHI_0.5_CODEX_BOOTSTRAP.md) ────────────
// Project = content.md + metadata.json + template.json + assets/
// "Single source" means one document model, not one physical file.

export const documentStatusSchema = z.enum(["draft", "review", "published"]);

export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const documentMetadataSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u, "project id must be a safe slug (unicode letters/digits allowed)"),
  title: z.string().min(1),
  subject: z.string().min(1),
  language: z.enum(["ar", "en"]),
  status: documentStatusSchema.default("draft"),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  publishedAt: z.string().optional(),
  currentVersion: z.number().int().positive().default(1),
  publicationCount: z.number().int().nonnegative().default(0),
  // last structural validation snapshot (Admin/Debug interest)
  lastValidation: z
    .object({
      at: z.string(),
      ok: z.boolean(),
      errors: z.number(),
      warnings: z.number(),
    })
    .optional(),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

// template.json — serializable StudioTheme; validate loosely (mergeTheme repairs
// old/partial saves) but reject non-object garbage here.
export const templateFileSchema = z.object({
  id: z.string().min(1),
}).passthrough();

export type TemplateFile = z.infer<typeof templateFileSchema>;

// Publication Package manifest (immutable once published).
// Reproducibility note: PDFs are reproducible (same inputs → same intended
// document) but NOT guaranteed byte-identical by the toolchain — the hashes
// below identify exact published artifacts, they are not a determinism claim.
export const publicationManifestSchema = z.object({
  version: z.number().int().positive(),
  publishedAt: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().min(1),
  language: z.enum(["ar", "en"]),
  templateId: z.string().min(1),
  contents: z.array(z.string()).min(1), // files inside the package
  validation: z.object({ ok: z.boolean(), errors: z.number(), warnings: z.number() }),
  hashes: z.object({
    /** sha256 of EVERY artifact in the package — posix relative path → hex
     *  digest. Optional so manifests published before full-artifact sealing
     *  still parse; their status is "legacy" (unverifiable, not tampered).
     *  manifest.json is intentionally absent — it carries these digests. */
    artifacts: z.record(z.string(), z.string()).optional(),
    /** sha256 of content.md — content identity (canonical source) */
    contentSha256: z.string().min(1),
    /** sha256 of document.pdf — exact published artifact identity */
    pdfSha256: z.string().min(1),
  }),
  toolchain: z.object({
    washi: z.string().min(1),
    schema: z.string().min(1),
    takumi: z.string().min(1),
  }),
});

export type PublicationManifest = z.infer<typeof publicationManifestSchema>;
