# CGP — Content Generation Pipeline

Research artifacts for chapter generation. **Not** Washi ChapterAST, renderer, or publication code.

| Phase | Status | Artifact |
|---|---|---|
| CGP-0 Source structure & topic discovery | done | `computer-networks-ch1.topic-map.json` |
| CGP-1 Topic deep extraction | done | `computer-networks-ch1.deep-topics.json` |
| CGP-2 Coverage / consistency validation | done | `computer-networks-ch1.validation.json` |
| CGP-3 Chapter composition architecture | done | `computer-networks-ch1.composition.json` + `computer-networks-ch1.chapter-plan.json` |
| CGP-4 Chapter authoring | done | `computer-networks-ch1.chapter.md` |
| CGP-4A Content review audit | done | `computer-networks-ch1.content-review.json` |

## Source

- Extracted PDF pages: `sources/forouzan-ch1.pages.json` (from user-supplied `شبكات - مقدمة.pdf`, 23 pages)
- Plain text: `sources/forouzan-ch1.txt`
- Extractor: `scripts/cgp-extract-source.py`
- Topic map builder: `scripts/cgp-build-topic-map.mjs`
- Deep topics builder: `scripts/cgp-build-deep-topics.mjs` + `scripts/cgp-deep/*`
- Schemas: `lib/cgp/schemas.ts` (`cgp.topic-map.v1`), `lib/cgp/deep-schemas.ts` (`cgp.deep-topics.v1`)

## Claim classes (CGP-1)

- `DIRECT_SOURCE` — supported by the attached Ch.1 PDF
- `NECESSARY_EXPLANATION` — minimal glue that does not change source meaning
- `EXTERNAL_CONTEXT` — enrichment; sample Shannon/SNR/T=L/B/ipconfig/MB-Mb/bandwidth-card live here
- `UNSUPPORTED` — never ships in the deep artifact

## Current chapter vs source

`public/samples/computer-networks-ch1.md` is a **compressed generated chapter**. It invents Shannon/SNR/T=L/B material that is **not** in the attached Ch.1 source, and omits large source blocks (topologies, Internet history, standards).

Do not use the sample as evidence of source coverage.
