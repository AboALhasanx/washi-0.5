/// <reference types="node" />
/**
 * lib/llm-summarize.ts
 * Provider-agnostic chapter summarizer. Embeds the strict system prompt from
 * prompts/01-chapter-summarizer-prompt.md verbatim and calls OpenAI when
 * OPENAI_API_KEY is present, otherwise throws a descriptive error.
 */

export interface SummarizeChapterParams {
  chapterText: string;
  subject: string;
  theme?: string; // defaults to "default" per markdown-schema-spec
  title: string;
  language: "ar" | "en";
  sourceDocument: string;
  sourcePages?: number[] | string;
}

const SYSTEM_PROMPT = `You are an Academic Knowledge Extraction Specialist. Your only job is to convert
one chapter of raw source text into a structured Markdown summary. You are not a
general tutor and you do not add outside knowledge.

INPUT you will receive:
- Raw extracted text of one chapter (may contain OCR/extraction noise — clean it up).
- Parameters: subject, theme, chapter title, target language (ar or en), and the
  source document name + page range if known.

STRICT RULES (do not violate these):
1. Zero hallucination. Every fact, definition, and formula must come from the
   supplied chapter text. Do not add outside facts, even if they are true in
   general — if it's not in the source, it does not go in the summary.
2. Preserve exact technical terminology (protocol names, algorithm names, model
   names, acronyms) exactly as written in the source, even when writing in Arabic.
   Do not translate proper nouns or technical acronyms (e.g. keep "TCP", "OSI",
   "Dijkstra", "NP-complete" as-is).
3. Preserve every LaTeX formula exactly as it should be typeset. Wrap block
   formulas in $$...$$ and inline formulas in $...$. Do not simplify or
   paraphrase equations.
4. Attach a source reference after any major claim or definition, as an HTML
   comment: <!-- source: p.<page> --> using the page range parameter provided.
   If no page info was given, omit this line rather than inventing a page number.
5. Follow the output schema below exactly. Do not add extra top-level sections
   and do not skip any of the required ones — if a section has no content for
   this chapter, write "لا يوجد محتوى لهذا القسم في المصدر" (or the English
   equivalent) instead of omitting the heading.
6. Use only these Markdown constructs, nothing else: headings (#, ##, ###),
   paragraphs, blockquotes formatted as > [!IMPORTANT] / > [!WARNING] / > [!NOTE],
   $$ LaTeX $$ blocks, GitHub-flavored tables, fenced code blocks, and images
   with alt text as ![caption](path). Do not invent custom syntax.
7. Write in the target language specified in the parameters. If the language is
   Arabic, keep technical terms in their original form (mixed Arabic/English is
   expected and correct, not an error).

REQUIRED OUTPUT SCHEMA (exact order):

---
subject: <subject-slug>
theme: <theme-slug>
title: <chapter title>
language: <ar|en>
sources:
  - document: <source document name>
    pages: [<page numbers>]
---

# <Chapter Title>

## نظرة عامة (Overview)
2-4 sentence high-level summary of what this chapter covers.

## المفاهيم الأساسية (Core Concepts)
The main ideas, organized under ### subsections as needed.

## قاموس التعريفات (Definitions Glossary)
Bullet list or short subsections: **Term**: definition, sourced from the text.

## المعادلات (Formulas)
Every formula from the chapter, in $$...$$ blocks, with a one-line explanation
of what each symbol means.

## أمثلة محلولة (Worked Examples)
Any worked examples from the source, step by step.

## نقاط مهمة (Important Callouts)
> [!IMPORTANT] statements pulled directly from emphasized content in the source.

## أسئلة مراجعة (Review Questions)
3-6 questions a student could use to self-test on this chapter's content,
grounded only in what was covered above.

END OF SCHEMA. Output nothing before the frontmatter and nothing after the
review questions section.`;

function formatSourcePages(
  pages?: number[] | string
): string | undefined {
  if (!pages) return undefined;
  if (typeof pages === "string") return pages;
  if (Array.isArray(pages) && pages.length > 0) return pages.join(", ");
  return undefined;
}

/**
 * Summarize a chapter's extracted text into strict 7-section Arabic/English Markdown.
 * @throws if OPENAI_API_KEY is not set (provider-agnostic guard) or on upstream errors.
 */
export async function summarizeChapter(
  params: SummarizeChapterParams
): Promise<string> {
  const {
    chapterText,
    subject,
    theme = "default",
    title,
    language,
    sourceDocument,
    sourcePages,
  } = params;

  // Basic validation (route also validates via zod; keep defensive here)
  if (!chapterText || !chapterText.trim()) {
    throw new Error("chapterText is required and cannot be empty");
  }
  if (!subject || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subject)) {
    throw new Error(
      "subject must be a lowercase-hyphenated slug, e.g., computer-networks"
    );
  }
  if (!title || !title.trim()) {
    throw new Error("title is required");
  }
  if (language !== "ar" && language !== "en") {
    throw new Error('language must be "ar" or "en"');
  }
  if (!sourceDocument || !sourceDocument.trim()) {
    throw new Error("sourceDocument is required");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Summarization requires an OpenAI API key. " +
        "Set OPENAI_API_KEY in your .env.local (see .env.example) and restart the server. " +
        "No mock provider is configured for production — add one for offline development if needed. " +
        "Example: OPENAI_API_KEY=sk-proj-... . " +
        "If you need a local mock for tests, implement a conditional mock branch in lib/llm-summarize.ts that returns a fixture markdown when process.env.NODE_ENV==='test' or when MOCK_LLM=true."
    );
  }

  const pagesStr = formatSourcePages(sourcePages);
  const userMessage = [
    `subject: ${subject}`,
    `theme: ${theme}`,
    `title: ${title}`,
    `language: ${language}`,
    `source_document: ${sourceDocument}`,
    `source_pages: ${pagesStr ?? "unknown"}`,
    "",
    chapterText,
  ].join("\n");

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 6000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `OpenAI API error (${res.status} ${res.statusText}): ${body.slice(0, 2000)}`
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new Error("OpenAI returned empty content");
  }

  return content.trim();
}

export default summarizeChapter;
