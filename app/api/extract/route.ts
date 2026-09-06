/// <reference types="node" />
import { NextResponse } from "next/server";
import { z } from "zod";
import { Buffer } from "node:buffer";
import { extractPdfText } from "@/lib/pdf-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validation for optional pagination fields (multipart form sends strings)
const querySchema = z.object({
  firstPage: z.coerce.number().int().positive().optional(),
  lastPage: z.coerce.number().int().positive().optional(),
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: "Invalid multipart/form-data request" },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    const firstPageRaw = formData.get("firstPage");
    const lastPageRaw = formData.get("lastPage");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing required field: file (multipart File)" },
        { status: 400 }
      );
    }

    // Basic file type check (allow application/pdf and .pdf extension)
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf") ||
      file.type === "application/octet-stream"; // some browsers send octet-stream
    if (!isPdf && file.type) {
      // Only warn, don't block octet-stream, but block obvious non-pdfs
      if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Expected application/pdf` },
          { status: 400 }
        );
      }
    }

    const parsed = querySchema.safeParse({
      firstPage: firstPageRaw ? String(firstPageRaw) : undefined,
      lastPage: lastPageRaw ? String(lastPageRaw) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid pagination parameters", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { firstPage, lastPage } = parsed.data;

    if (
      firstPage !== undefined &&
      lastPage !== undefined &&
      firstPage > lastPage
    ) {
      return NextResponse.json(
        { error: `Invalid page range: firstPage (${firstPage}) > lastPage (${lastPage})` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    const result = await extractPdfText(buffer, {
      firstPage,
      lastPage,
    });

    return NextResponse.json({
      text: result.text,
      numPages: result.numPages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    // Distinguish client page-range errors (400) from server errors (500)
    const isRangeError = /Invalid page range|firstPage|lastPage/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: isRangeError ? 400 : 500 }
    );
  }
}
