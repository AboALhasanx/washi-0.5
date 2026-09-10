import { z } from "zod";
import { AST_SCHEMA, APP_CONTENT_SCHEMA } from "./version";

/**
 * Schemas for Washi — validates structured Markdown frontmatter
 * and ChapterAST, plus every artifact a publication package ships.
 *
 * Rule: if it is written to disk and read back by another process, it has a
 * Zod schema here. The TypeScript interfaces for those artifacts are *inferred*
 * from these schemas (never hand-written), so the type and the runtime check
 * cannot drift apart.
 *
 * Frontmatter required: subject, title, language, sources[]
 * (theme is DEPRECATED — presentation belongs exclusively to template.json;
 * the field is accepted for backward compatibility with existing content and
 * ignored by the renderer.)
 * ChapterAST: finite vocabulary mapped to pdfcn components via KeepTogether etc.
 */

// ── Frontmatter ──────────────────────────────────────────────────────────────

/** Page numbers are 1-based positive integers everywhere in Washi — frontmatter
 *  sources and per-block provenance both derive from this, so the rule
 *  ("a page is a positive int") is stated exactly once. */
export const pageNumbersSchema = z.array(z.number().int().positive());

export const sourceEntrySchema = z.object({
  document: z.string().min(1, "document filename required, e.g., Computer Networks.pdf"),
  pages: pageNumbersSchema
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
    pages: pageNumbersSchema.optional(),
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

/**
 * template.json — the serialized StudioTheme (lib/theme.ts:19).
 *
 * Every group is OPTIONAL except `id`: mergeTheme() repairs partial saves and
 * fills forward new fields, so a strict full-object schema would reject themes
 * saved before the last schema addition. What this DOES buy is type safety on
 * the fields that are present — a template whose `colors` is a string, or whose
 * callout `chip` is a 3-tuple, is garbage no merge can repair.
 *
 * Not `.strict()` on purpose: unknown keys are how themes carry forward.
 */
const cssColorSchema = z.string().min(1);

const calloutStyleSchema = z
  .object({
    bg: cssColorSchema.optional(),
    border: cssColorSchema.optional(),
    text: cssColorSchema.optional(),
    chip: z.tuple([cssColorSchema, cssColorSchema]).optional(),
  })
  .optional();

export const studioThemeSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  colors: z
    .object({
      paper: cssColorSchema.optional(),
      ink: cssColorSchema.optional(),
      ink2: cssColorSchema.optional(),
      muted: cssColorSchema.optional(),
      hairline: cssColorSchema.optional(),
      accent: cssColorSchema.optional(),
      accentDeep: cssColorSchema.optional(),
      accentSoft: cssColorSchema.optional(),
      surface: cssColorSchema.optional(),
      gold: cssColorSchema.optional(),
    })
    .optional(),
  callouts: z
    .object({
      note: calloutStyleSchema,
      important: calloutStyleSchema,
      warning: calloutStyleSchema,
      example: calloutStyleSchema,
      tip: calloutStyleSchema,
    })
    .optional(),
  fonts: z
    .object({
      body: z.string().optional(),
      heading: z.string().optional(),
      mono: z.string().optional(),
      bodySize: z.number().positive().optional(),
      lineHeight: z.number().positive().optional(),
    })
    .optional(),
  page: z
    .object({
      size: z.enum(["a4", "letter"]).optional(),
      background: cssColorSchema.optional(),
      marginTop: z.number().optional(),
      marginSide: z.number().optional(),
    })
    .optional(),
  cover: z
    .object({
      enabled: z.boolean().optional(),
      brand: z.string().optional(),
      badge: z.string().optional(),
      lede: z.string().optional(),
    })
    .optional(),
  footer: z
    .object({
      brand: z.string().optional(),
      tagline: z.string().optional(),
      showPageNumbers: z.boolean().optional(),
    })
    .optional(),
});

/** template.json on disk — same shape, `id` is the only requirement. */
export const templateFileSchema = studioThemeSchema;

export type TemplateFile = z.infer<typeof templateFileSchema>;

/** Validate a hand-edited / API-supplied theme before it reaches disk. */
export function parseTemplateFile(data: unknown, what = "template.json"): TemplateFile {
  return mustParse(templateFileSchema, data, what);
}

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

/**
 * READ-side manifest contract.
 *
 * The very first package ever published (`شبكات-الحاسوب-الفصل-الأول/v1`) predates
 * the schema: it carries no `templateId`, no `hashes`, no `toolchain`. Writing
 * is strict (see `parsePublicationManifest`), reading cannot be — a strict read
 * would make a real frozen package unreadable, and frozen packages are never
 * migrated. So the reader accepts the pre-schema shape and lets
 * `verifyPublication` report it as `legacy`, which is the honest answer.
 */
export const manifestReadSchema = z.object({
  version: z.number().int().positive(),
  publishedAt: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().min(1),
  language: z.enum(["ar", "en"]),
  templateId: z.string().min(1).optional(),
  contents: z.array(z.string()).optional(),
  validation: z
    .object({ ok: z.boolean(), errors: z.number(), warnings: z.number() })
    .optional(),
  hashes: z
    .object({
      artifacts: z.record(z.string(), z.string()).optional(),
      contentSha256: z.string().min(1).optional(),
      pdfSha256: z.string().min(1).optional(),
    })
    .optional(),
  toolchain: z
    .object({
      washi: z.string().optional(),
      schema: z.string().optional(),
      takumi: z.string().optional(),
    })
    .optional(),
});

export type ManifestRead = z.infer<typeof manifestReadSchema>;

/**
 * Artifact contracts (M2) ────────────────────────────────────────────────────
 *
 * These two artifacts cross a process boundary: Core writes them into a frozen
 * publication package, the educational platform reads them months later. A
 * TypeScript interface cannot travel that far — a Zod schema can.
 */

/** Stable block id assigned when the artifact is built (`b{section}-{block}`). */
const blockIdSchema = z.string().min(1, "block id is required");

/** document.ast nodes keep provenance — it is the whole point of that file. */
export const astNodeWithIdSchema = z.discriminatedUnion("type", [
  headingNodeSchema.extend({ id: blockIdSchema }),
  paragraphNodeSchema.extend({ id: blockIdSchema }),
  calloutNodeSchema.extend({ id: blockIdSchema }),
  definitionNodeSchema.extend({ id: blockIdSchema }),
  formulaNodeSchema.extend({ id: blockIdSchema }),
  tableNodeSchema.extend({ id: blockIdSchema }),
  figureNodeSchema.extend({ id: blockIdSchema }),
  codeBlockNodeSchema.extend({ id: blockIdSchema }),
  listNodeSchema.extend({ id: blockIdSchema }),
  sourceCommentNodeSchema.extend({ id: blockIdSchema }),
]);

export type AstNodeWithId = z.infer<typeof astNodeWithIdSchema>;

export const documentAstSectionSchema = z.object({
  id: z.string().min(1),
  name: sectionNameSchema,
  heading: z.string().min(1),
  source: z.string().optional(),
  provenance: z.array(provenanceRefSchema).optional(),
  nodes: z.array(astNodeWithIdSchema),
});

export const documentAstSchema = z.object({
  schema: z.literal(AST_SCHEMA),
  generatedAt: z.string().min(1),
  frontmatter: frontmatterSchema,
  sections: z.array(documentAstSectionSchema).min(1),
  stats: z.object({
    sections: z.number().int().nonnegative(),
    blocks: z.number().int().nonnegative(),
    definitions: z.number().int().nonnegative(),
    formulas: z.number().int().nonnegative(),
    tables: z.number().int().nonnegative(),
    figures: z.number().int().nonnegative(),
    provenanceBlocks: z.number().int().nonnegative(),
  }),
});

export type DocumentAst = z.infer<typeof documentAstSchema>;

/* ── app-content.json ─────────────────────────────────────────────────────── */

/**
 * app-content blocks are AST nodes MINUS provenance — the platform displays,
 * it does not audit. `sourceCommentNodeSchema` has no provenance fields to
 * strip, hence the one variant without `.omit()`.
 *
 * NOT `.strict()`: the block vocabulary may grow, and a package published
 * today must still parse after the vocabulary does.
 */
export const appBlockSchema = z.discriminatedUnion("type", [
  headingNodeSchema.omit({ source: true, provenance: true }).extend({ id: blockIdSchema }),
  paragraphNodeSchema.omit({ source: true, provenance: true }).extend({ id: blockIdSchema }),
  calloutNodeSchema.omit({ source: true, provenance: true }).extend({ id: blockIdSchema }),
  definitionNodeSchema.omit({ source: true, provenance: true }).extend({ id: blockIdSchema }),
  formulaNodeSchema.omit({ source: true, provenance: true }).extend({ id: blockIdSchema }),
  tableNodeSchema.omit({ source: true, provenance: true }).extend({ id: blockIdSchema }),
  figureNodeSchema.omit({ source: true, provenance: true }).extend({ id: blockIdSchema }),
  codeBlockNodeSchema.omit({ source: true, provenance: true }).extend({ id: blockIdSchema }),
  listNodeSchema.omit({ source: true, provenance: true }).extend({ id: blockIdSchema }),
  sourceCommentNodeSchema.extend({ id: blockIdSchema }),
]);

export type AppBlock = z.infer<typeof appBlockSchema>;

export const appConceptSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1),
  definition: z.string().min(1),
  blockId: z.string().min(1),
  sectionId: z.string().min(1),
});

export const appQuestionCandidateSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  sectionId: z.string().min(1),
  suggestedConceptIds: z.array(z.string()),
});

export const appFlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  conceptId: z.string().min(1),
});

export const appContentSchema = z.object({
  schema: z.literal(APP_CONTENT_SCHEMA),
  generatedAt: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().min(1),
  language: z.enum(["ar", "en"]),
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        name: sectionNameSchema,
        heading: z.string().min(1),
        blocks: z.array(appBlockSchema),
      })
    )
    .min(1),
  concepts: z.array(appConceptSchema),
  questionCandidates: z.array(appQuestionCandidateSchema),
  flashcards: z.array(appFlashcardSchema),
  stats: z.object({
    blocks: z.number().int().nonnegative(),
    concepts: z.number().int().nonnegative(),
    flashcards: z.number().int().nonnegative(),
    questionCandidates: z.number().int().nonnegative(),
  }),
});

export type AppContent = z.infer<typeof appContentSchema>;
export type AppContentStats = AppContent["stats"];

/* ── Parse helpers ───────────────────────────────────────────────────────── */

/** Turns a ZodError into one line per issue, Arabic-headed, path-qualified. */
export function formatZodError(err: z.ZodError, max = 5): string {
  const issues = err.errors.slice(0, max).map((i) => {
    const at = i.path.length ? i.path.join(".") : "(root)";
    return `${at}: ${i.message}`;
  });
  const rest = err.errors.length - issues.length;
  return issues.join(" | ") + (rest > 0 ? ` | …و${rest} مشكلة أخرى` : "");
}

/**
 * `z.ZodType<T>` widens to the schema's INPUT type, not its output — with
 * `.default()` fields (definition.variant) that means the function claims to
 * return `variant?: "NOTE"` instead of `variant: "NOTE"`. Taking the schema
 * generically and returning `z.output<S>` preserves the post-parse shape.
 */
function mustParse<S extends z.ZodTypeAny>(schema: S, data: unknown, what: string): z.output<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new Error(`${what}: عقد غير صالح — ${formatZodError(r.error)}`);
  }
  return r.data;
}

export function parseDocumentAst(data: unknown, what = "document.ast"): DocumentAst {
  return mustParse(documentAstSchema, data, what);
}

export function parseAppContent(data: unknown, what = "app-content.json"): AppContent {
  return mustParse(appContentSchema, data, what);
}

/** WRITE side — what a freshly built manifest must satisfy. */
export function parsePublicationManifest(data: unknown, what = "manifest.json"): PublicationManifest {
  return mustParse(publicationManifestSchema, data, what);
}

/** READ side — also accepts pre-schema manifests (see `manifestReadSchema`). */
export function parseManifestForRead(data: unknown, what = "manifest.json"): ManifestRead {
  return mustParse(manifestReadSchema, data, what);
}
