# CGP — Content Generation Pipeline

Research artifacts for chapter generation. **Not** Washi ChapterAST, renderer, or publication code.

| Phase | Status | Artifact |
|---|---|---|
| CGP-0 Source structure & topic discovery | done | `computer-networks-ch1.topic-map.json` |
| CGP-1 Topic deep extraction | next | — |
| Coverage validation | pending | — |
| Chapter composition | pending | — |

## Source for CGP-0

- Extracted PDF pages: `sources/forouzan-ch1.pages.json` (from user-supplied `شبكات - مقدمة.pdf`, 23 pages)
- Plain text: `sources/forouzan-ch1.txt`
- Extractor: `scripts/cgp-extract-source.py`
- Topic map builder: `scripts/cgp-build-topic-map.mjs`
- Schema: `lib/cgp/schemas.ts` (`cgp.topic-map.v1`)

## Current chapter vs source

`public/samples/computer-networks-ch1.md` is a **compressed generated chapter**. It invents Shannon/SNR/T=L/B material that is **not** in the attached Ch.1 source, and omits large source blocks (topologies, Internet history, standards).

Do not use the sample as evidence of source coverage.
