import { NextResponse } from "next/server";
import { z } from "zod";
import { summarizeChapter } from "@/lib/llm-summarize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  chapterText: z.string().min(1, "chapterText is required and cannot be empty"),
  subject: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "subject must be lowercase-hyphenated slug, e.g., computer-networks"
    ),
  title: z.string().min(1, "title is required"),
  language: z.enum(["ar", "en"], {
    errorMap: () => ({ message: 'language must be "ar" or "en"' }),
  }),
  sourceDocument: z.string().min(1, "sourceDocument is required"),
  // sourcePages: allow number[], string, or undefined
  sourcePages: z
    .union([z.array(z.number().int().positive()), z.string().min(1)])
    .optional(),
  theme: z.string().optional().default("default"),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { chapterText, subject, title, language, sourceDocument, sourcePages, theme } =
    parsed.data;

  try {
    const markdown = await summarizeChapter({
      chapterText,
      subject,
      theme: theme ?? "default",
      title,
      language,
      sourceDocument,
      sourcePages: sourcePages as number[] | string | undefined,
    });

    return NextResponse.json({ markdown });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown summarization error";
    const isMissingKey = /OPENAI_API_KEY is not set/i.test(message);
    const isValidation = /chapterText|subject|title|language|sourceDocument/i.test(message);
    // 503 for missing API key (service unavailable / not configured), 400 for client validation, 500 otherwise
    const status = isMissingKey ? 503 : isValidation ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
