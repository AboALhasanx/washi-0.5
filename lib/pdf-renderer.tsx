/**
 * lib/pdf-renderer.tsx
 * ChapterPdf — maps ChapterAST -> pdfcn primitives via KeepTogether composition.
 *
 * Per corrected specs/pdfcn-components-catalog.md and specs/pagination-rules.md:
 * - Actual pdfcn primitives: Alert, Badge, Card, DataTable, Divider, Form, Graph, Heading, KeepTogether, KeyValue, Link, List, PageBreak, PageFooter, PageHeader, PageNumber, PdfImage, QRCode, Section, Signature, Stack, Table, Text, Watermark
 * - KeepTogether = break-inside:avoid (preferred)
 * - Academic vocab is COMPOSED: Definition => KeepTogether(Card(Heading+Text)), Callout => KeepTogether(Alert), Formula => KeepTogether(Card(PdfImage)), etc.
 *
 * TODO: install pdfcn primitives via:
 *   npx shadcn add @pdfcn/card @pdfcn/alert @pdfcn/heading @pdfcn/table @pdfcn/data-table @pdfcn/keep-together @pdfcn/pdf-image @pdfcn/section @pdfcn/page-break @pdfcn/list @pdfcn/text @pdfcn/page-header @pdfcn/page-footer @pdfcn/page-number @pdfcn/divider
 *
 * Pagination helpers:
 * - Definition/Formula/Callout/Figure/CodeBlock/Summary => KeepTogether
 * - Section headings => break-after-avoid / break-inside-avoid + orphans/widows
 * - ComparisonTable <thead> => display: table-header-group (repeats per page)
 */

import React from "react";
import type { ChapterAST, AstNode } from "./schemas";
import { renderFormulaToSvg } from "./render-formula";
import { tokens } from "@/themes/default/tokens";

// ---------------------------------------------------------------------------
// TODO: replace stubs with real pdfcn imports once `npx shadcn add` is run
// npx shadcn add @pdfcn/card @pdfcn/alert @pdfcn/heading @pdfcn/table @pdfcn/data-table @pdfcn/keep-together @pdfcn/pdf-image @pdfcn/section @pdfcn/page-break @pdfcn/list @pdfcn/text
// ---------------------------------------------------------------------------

// --- Stubs for pdfcn primitives (swap with real imports) ---
// TODO: import { Card, CardHeader, CardContent } from "@/components/pdfcn/card";
// TODO: import { Alert } from "@/components/pdfcn/alert";
// TODO: import { Heading } from "@/components/pdfcn/heading";
// TODO: import { Section } from "@/components/pdfcn/section";
// TODO: import { Text } from "@/components/pdfcn/text";
// TODO: import { KeepTogether } from "@/components/pdfcn/keep-together";
// TODO: import { PdfImage } from "@/components/pdfcn/pdf-image";
// TODO: import { PageBreak } from "@/components/pdfcn/page-break";
// TODO: import { PageHeader, PageFooter, PageNumber } from "@/components/pdfcn/page-header";
// TODO: import { Table, DataTable } from "@/components/pdfcn/table";
// TODO: import { List } from "@/components/pdfcn/list";
// TODO: import { Divider } from "@/components/pdfcn/divider";
// TODO: import { Stack } from "@/components/pdfcn/stack";

// Minimal fallback components that emit correct classNames + semantics so
// pagination still works even before pdfcn is installed. Replace with real imports.

const KeepTogether: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`keep-together break-inside-avoid ${className ?? ""}`} style={{ breakInside: "avoid" as const }}>
    {children}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className, style }) => (
  <div className={`rounded-[8pt] border border-slate-200 bg-white p-[12pt] ${className ?? ""}`} style={style}>
    {children}
  </div>
);

const Alert: React.FC<{ children: React.ReactNode; variant?: string; className?: string }> = ({ children, variant = "note", className }) => {
  const map: Record<string, string> = {
    NOTE: "bg-[#dbeafe] border-[#93c5fd] text-[#1e40af]",
    IMPORTANT: "bg-[#fef3c7] border-[#fcd34d] text-[#92400e]",
    WARNING: "bg-[#fee2e2] border-[#fca5a5] text-[#991b1b]",
    EXAMPLE: "bg-[#dcfce7] border-[#86efac] text-[#166534]",
    note: "bg-[#dbeafe] border-[#93c5fd] text-[#1e40af]",
    important: "bg-[#fef3c7] border-[#fcd34d] text-[#92400e]",
    warning: "bg-[#fee2e2] border-[#fca5a5] text-[#991b1b]",
    example: "bg-[#dcfce7] border-[#86efac] text-[#166534]",
  };
  return <div className={`rounded-md border p-[10pt] ${map[variant] ?? map.note} ${className ?? ""}`} role="note">{children}</div>;
};

const Heading: React.FC<{ level?: 1 | 2 | 3; children: React.ReactNode; className?: string }> = ({ level = 2, children, className }) => {
  const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  const base =
    level === 1
      ? "text-[26pt] font-bold leading-[1.2] tracking-[-0.02em]"
      : level === 2
      ? "text-[16pt] font-semibold leading-[1.3] break-after-avoid break-inside-avoid"
      : "text-[13pt] font-semibold leading-[1.4] break-after-avoid";
  return <Tag className={`${base} ${className ?? ""}`}>{children}</Tag>;
};

const Text: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className, style }) => (
  <p className={`text-[10pt] leading-[1.6] ${className ?? ""}`} style={style}>{children}</p>
);

const Section: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className, style }) => (
  <section className={`${className ?? ""}`} style={style}>{children}</section>
);

const PageBreak: React.FC = () => <div className="break-before-page" style={{ breakBefore: "page" as const }} />;

const PageHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <header className="w-full bg-slate-50 border-b border-slate-200 px-[20mm] py-[6pt] text-[8pt] text-slate-500 flex justify-between">{children}</header>
);
const PageFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <footer className="w-full bg-slate-100 border-t border-slate-200 px-[20mm] py-[6pt] text-[8pt] text-slate-500 flex justify-between">{children}</footer>
);
const PageNumber: React.FC = () => <span className="page-number text-[8pt]">—</span>;

const PdfImage: React.FC<{ src: string; alt?: string; caption?: string; className?: string; style?: React.CSSProperties }> = ({ src, alt, className, style }) => (
  // TODO: verify PdfImage accepts inline SVG strings vs PNG data URI vs file path.
  // If SVG not accepted, pass PNG data URI from renderFormulaToPng via sharp/resvg.
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt ?? ""} className={`max-w-full h-auto object-contain ${className ?? ""}`} style={{ aspectRatio: "auto", ...style }} />
);

const Table: React.FC<{ headers: string[]; rows: string[][]; caption?: string }> = ({ headers, rows, caption }) => (
  <div className="overflow-hidden rounded-md border border-slate-200">
    <table className="w-full text-[9pt] border-collapse">
      <thead className="table-header-group bg-slate-50" style={{ display: "table-header-group" as const }}>
        <tr>{headers.map((h, i) => (<th key={i} className="text-left font-semibold px-[8pt] py-[6pt] border-b border-slate-200">{h}</th>))}</tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
            {row.map((cell, ci) => (<td key={ci} className="px-[8pt] py-[6pt] border-b border-slate-100 align-top">{cell}</td>))}
          </tr>
        ))}
      </tbody>
    </table>
    {caption && <div className="px-[8pt] py-[4pt] text-[8pt] italic text-slate-500 bg-white border-t">{caption}</div>}
  </div>
);

const DataTable = Table; // alias per spec: DataTable or Table for ComparisonTable

const List: React.FC<{ items: string[]; ordered?: boolean }> = ({ items, ordered }) => {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={ordered ? "list-decimal list-inside space-y-[4pt]" : "list-disc list-inside space-y-[4pt]" }>
      {items.map((it, i) => (<li key={i} className="text-[10pt] leading-[1.6]">{it}</li>))}
    </Tag>
  );
};

const Divider: React.FC = () => <hr className="my-[16pt] border-slate-200" />;

// ---------------------------------------------------------------------------
// Node renderers (composition table)
// ---------------------------------------------------------------------------

function RenderDefinition({ term, definition, source }: { term: string; definition: string; source?: string }) {
  return (
    <KeepTogether>
      <Card>
        <Heading level={3}>{term}</Heading>
        <Text className="mt-[4pt]">{definition}</Text>
        {source && <Text className="mt-[6pt] text-[8pt] text-slate-500 italic">{source}</Text>}
      </Card>
    </KeepTogether>
  );
}

function RenderCallout({ variant, content, source }: { variant: string; content: string; source?: string }) {
  const v = variant.toLowerCase();
  return (
    <KeepTogether>
      <Alert variant={v}>
        <Text className="font-medium">{content}</Text>
        {source && <Text className="mt-[4pt] text-[8pt] opacity-80">{source}</Text>}
      </Alert>
    </KeepTogether>
  );
}

function RenderFormula({ latex, caption, source, displayMode }: { latex: string; caption?: string; source?: string; displayMode?: boolean }) {
  const svgHtml = renderFormulaToSvg(latex, { displayMode: displayMode ?? true });
  const isHtml = svgHtml.includes("<span") || svgHtml.includes("katex");
  // If PdfImage cannot render HTML fragment, fallback to data URI or show via dangerouslySetInnerHTML inside Card
  return (
    <KeepTogether>
      <Card className="flex flex-col items-center">
        {isHtml ? (
          <div
            className="w-full flex justify-center py-[6pt]"
            // KaTeX HTML fragment — safe (sanitized)
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <PdfImage src={svgHtml} alt={latex.slice(0, 80)} />
        )}
        {caption && <Text className="mt-[6pt] text-[8pt] italic text-slate-500 text-center">{caption}</Text>}
        {source && <Text className="mt-[2pt] text-[8pt] text-slate-400 text-center">{source}</Text>}
      </Card>
    </KeepTogether>
  );
}

function RenderComparisonTable({ headers, rows, caption, source }: { headers: string[]; rows: string[][]; caption?: string; source?: string }) {
  return (
    <div className="my-[12pt]">
      <DataTable headers={headers} rows={rows} caption={caption} />
      {source && <Text className="mt-[4pt] text-[8pt] text-slate-400">{source}</Text>}
    </div>
  );
}

function RenderFigure({ src, alt, caption, source }: { src: string; alt: string; caption: string; source?: string }) {
  return (
    <KeepTogether>
      <div className="flex flex-col items-center rounded-[8pt] border border-slate-200 bg-white p-[8pt]">
        <PdfImage src={src} alt={alt} className="max-h-[50vh] w-auto" style={{ aspectRatio: "auto" }} />
        <Text className="mt-[6pt] text-[8pt] italic text-slate-600 text-center">{caption}</Text>
        {source && <Text className="mt-[2pt] text-[8pt] text-slate-400 text-center">{source}</Text>}
      </div>
    </KeepTogether>
  );
}

function RenderCodeBlock({ code, language, source }: { code: string; language?: string; source?: string }) {
  return (
    <KeepTogether>
      <Card className="bg-slate-50">
        {language && <Text className="text-[8pt] font-semibold text-slate-500 uppercase tracking-wide mb-[6pt]">{language}</Text>}
        <pre className="overflow-x-auto">
          <Text className="font-mono text-[8.5pt] leading-[1.5] whitespace-pre-wrap" style={{ fontFamily: tokens.typography.code.fontFamily }}>
            {code}
          </Text>
        </pre>
        {source && <Text className="mt-[6pt] text-[8pt] text-slate-400">{source}</Text>}
      </Card>
    </KeepTogether>
  );
}

function RenderSummary({ heading, items, source }: { heading?: string; items: string[]; source?: string }) {
  return (
    <KeepTogether>
      <Card>
        <Heading level={3}>{heading ?? "Summary"}</Heading>
        <div className="mt-[8pt]">
          <List items={items} />
        </div>
        {source && <Text className="mt-[6pt] text-[8pt] text-slate-400">{source}</Text>}
      </Card>
    </KeepTogether>
  );
}

// ---------------------------------------------------------------------------
// ChapterPdf root
// ---------------------------------------------------------------------------

export interface ChapterPdfProps {
  ast: ChapterAST;
  theme?: typeof tokens;
}

export function ChapterPdf({ ast, theme = tokens }: ChapterPdfProps) {
  const { frontmatter, sections } = ast;
  const isAr = frontmatter.language === "ar";

  return (
    <div
      className="academic-pdf bg-white text-slate-900"
      style={{
        fontFamily: theme.typography.body.fontFamily,
        color: theme.colors.foreground,
        background: theme.colors.background,
        direction: (isAr ? "rtl" : "ltr") as any,
      }}
    >
      {/* Page chrome */}
      <PageHeader>
        <span className="font-medium">{frontmatter.subject}</span>
        <span>{frontmatter.title}</span>
      </PageHeader>

      {/* ChapterTitle — always break before page */}
      <PageBreak />
      <Section className="break-before-page px-[20mm] pt-[12mm]">
        <Heading level={1}>{frontmatter.title}</Heading>
        <Text className="mt-[6pt] text-[9pt] text-slate-500">
          {frontmatter.sources.map((s) => `${s.document} p.${s.pages.join(", ")}`).join(" • ")}
        </Text>
        {isAr && <Text className="mt-[4pt] text-[8pt] text-slate-500">الموضوع: {frontmatter.subject} — اللغة: {frontmatter.language}</Text>}
      </Section>

      <Divider />

      {/* Sections */}
      {sections.map((sec, idx) => (
        <Section key={idx} className="px-[20mm] py-[8pt]">
          {/* Section heading with pagination safety: break-after-avoid + break-inside-avoid */}
          <Heading
            level={2}
            className="break-after-avoid break-inside-avoid"
          >
            {sec.heading}
          </Heading>
          {sec.source && <Text className="mt-[2pt] text-[8pt] text-slate-400">{sec.source}</Text>}

          <div className="mt-[10pt] space-y-[12pt]">
            {sec.nodes.map((node: any, nIdx: number) => {
              switch (node.type) {
                case "heading":
                  // Subsection headings (h3) — avoid orphan
                  if (node.level === 3) {
                    return (
                      <Heading key={nIdx} level={3} className="break-after-avoid mt-[12pt]">
                        {node.text}
                      </Heading>
                    );
                  }
                  // h2 already rendered as section heading; skip duplicate if same text
                  if (node.level === 2 && node.text === sec.heading) return null;
                  return (
                    <Heading key={nIdx} level={node.level}>
                      {node.text}
                    </Heading>
                  );
                case "definition":
                  return <RenderDefinition key={nIdx} term={node.term} definition={node.definition} source={node.source} />;
                case "callout":
                  return <RenderCallout key={nIdx} variant={node.variant} content={node.content} source={node.source} />;
                case "formula":
                  return <RenderFormula key={nIdx} latex={node.latex} caption={node.caption} source={node.source} displayMode={node.displayMode} />;
                case "table":
                  return <RenderComparisonTable key={nIdx} headers={node.headers} rows={node.rows} caption={node.caption} source={node.source} />;
                case "figure":
                  return <RenderFigure key={nIdx} src={node.src} alt={node.alt} caption={node.caption} source={node.source} />;
                case "code":
                  return <RenderCodeBlock key={nIdx} code={node.code} language={node.language} source={node.source} />;
                case "list":
                  // Detect summary list: if section is key-points/review/overview with single list -> Summary card
                  if (sec.name === "key-points" || sec.name === "review" || (sec.nodes.length === 1 && node.type === "list")) {
                    // Render as Summary card when section suggests it
                    const isSummarySection = sec.name === "key-points" || sec.name === "review";
                    if (isSummarySection && sec.nodes.filter((n) => n.type === "list").length === 1) {
                      return <RenderSummary key={nIdx} heading={sec.heading} items={node.items} source={node.source} />;
                    }
                  }
                  return (
                    <div key={nIdx} className={node.paginationSafe ? "keep-together break-inside-avoid" : ""}>
                      <List items={node.items} ordered={node.ordered} />
                    </div>
                  );
                case "paragraph":
                  return <Text key={nIdx}>{node.text}</Text>;
                case "source":
                  return <Text key={nIdx} className="text-[8pt] text-slate-400 italic">Source: {node.raw}</Text>;
                default:
                  // Fallback — unknown type -> keepTogether Alert note
                  return (
                    <KeepTogether key={nIdx}>
                      <Alert variant="note">
                        <Text>{JSON.stringify(node)}</Text>
                      </Alert>
                    </KeepTogether>
                  );
              }
            })}
          </div>
        </Section>
      ))}

      <PageFooter>
        <span>{frontmatter.subject} — {frontmatter.title}</span>
        <PageNumber />
      </PageFooter>

      {/* Pagination CSS reinforcement — KeepTogether does break-inside:avoid, headings avoid orphans */}
      <style>{`
        .keep-together, .definition, .formula, .figure, .code-block, .summary { break-inside: avoid; }
        thead { display: table-header-group; }
        h2, h3 { break-after: avoid; break-inside: avoid; orphans: 3; widows: 3; }
      `}</style>
    </div>
  );
}

export default ChapterPdf;
