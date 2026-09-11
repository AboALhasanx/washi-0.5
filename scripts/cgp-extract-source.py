"""Extract page-level text from the attached source PDF for CGP-0."""
from __future__ import annotations

import json
from pathlib import Path

from pypdf import PdfReader

SRC = Path(r"C:\Users\gokoq\Downloads\شبكات - مقدمة.pdf")
OUT = Path(r"C:\Users\gokoq\prog\washi-0.5\content\cgp\sources")
OUT.mkdir(parents=True, exist_ok=True)

reader = PdfReader(str(SRC))
pages = []
for i, page in enumerate(reader.pages, 1):
    text = page.extract_text() or ""
    pages.append({"page": i, "chars": len(text), "text": text})

meta = {
    "id": "src-forouzan-ch1-intro",
    "file": "شبكات - مقدمة.pdf",
    "originalPath": str(SRC),
    "pageCount": len(pages),
    "producer": (reader.metadata.producer if reader.metadata else None),
    "creator": (reader.metadata.creator if reader.metadata else None),
    "extractor": "pypdf.extract_text",
    "note": "Case A source PDF supplied by user for CGP-0. Not the fictional sample documents named in computer-networks-ch1.md frontmatter.",
}

(OUT / "forouzan-ch1.pages.json").write_text(
    json.dumps({"meta": meta, "pages": pages}, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

chunks = []
for pg in pages:
    chunks.append(f"\n===== PAGE {pg['page']} =====\n")
    chunks.append(pg["text"])
(OUT / "forouzan-ch1.txt").write_text("".join(chunks), encoding="utf-8")

print("pages", len(pages))
print("total_chars", sum(p["chars"] for p in pages))
print("page_char_counts", [p["chars"] for p in pages])
