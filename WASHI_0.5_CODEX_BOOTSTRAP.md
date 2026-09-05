# Washi 0.5 — Codex Bootstrap File

## How to use this file

This is the starting brief for a new Codex task working on Washi 0.5. Read it before proposing architecture, creating code, or expanding scope.

The decisions below are the product direction already agreed upon. Small technical choices are left to the implementer when they serve this direction and do not expand the milestone.

## Product identity

**Name:** Washi 0.5  
**Working title:** Educational Content Publisher  
**Primary role:** An authoring and publishing tool for structured educational documents.  
**Primary user:** The human content producer/editor.  
**Current focus:** Producing material for the educational platform.  
**Long-term direction:** Washi SaaS may later add cloud, collaboration, integrated AI, providers, marketplaces, and other capabilities. Those are not part of 0.5.

Washi does not edit a PDF as a final flat artifact. It edits a document project and produces a PDF publication from that project.

## Core promise

Washi takes an educational document source and authors a publication from it.

- Markdown is the source of content.
- The AST is the intelligent derived representation.
- The template is the presentation language.
- pdfcn provides reusable document components.
- Takumi performs the actual PDF rendering.
- The educational platform consumes the published content; it does not author it.

The PDF is the primary publication format in this milestone, but it is not the only useful artifact.

## Four-layer mental model

### 1. Content

Structured Markdown contains the words and semantic authoring material:

- prose and headings;
- definitions;
- callouts;
- tables;
- formulas;
- images;
- sources;
- ordering and semantic information.

### 2. Document Model

The parser derives an AST from Markdown and may extend it with system information such as:

- element type and order;
- source/provenance references;
- metadata;
- relationships;
- analysis information useful to the platform.

The AST is not a replacement for Markdown. Markdown remains the primary content source; the AST is a derived and enriched representation.

### 3. Presentation

Templates and themes define how the document looks:

- page size and margins;
- typography and fonts;
- colors;
- cover;
- page background;
- spacing;
- component visual defaults;
- image treatment.

### 4. Rendering

The intended rendering relationship is:

`Washi → pdfcn components → Takumi → PDF`

Washi is the document engineer/orchestrator, pdfcn is the component vocabulary, and Takumi is the renderer.

## Source-of-truth model

“Single source” means one document model, not one physical file containing every kind of data.

The project may be organized conceptually like this:

```text
Project
├── content.md
├── metadata.json
├── assets/
└── template.json
```

Each part represents a different kind of truth:

- `content.md` — what the document says;
- `metadata.json` — what the system knows about the project/document;
- `assets/` — binary content and linked files;
- `template.json` — how the document is presented.

Changing presentation must not rewrite content. For example, changing a color changes the theme/template configuration, not the Markdown, because color is not content.

## Editor behavior

The editor works on the document project:

- editing definition text updates Markdown/content;
- changing an element type updates the Markdown/AST structure;
- changing order updates content order;
- changing color updates theme/template configuration;
- changing font updates presentation settings;
- changing an image updates the asset reference.

The PDF is a direct result of the current project state.

## Preview and rendering

The preview should use the same Takumi-based render path as the final PDF as far as practical. The goal is maximum preview/PDF fidelity, even if small latency is accepted.

The intended flow is:

```text
Edit
 ↓
Update document state
 ↓
Render
 ↓
Preview
```

Design the system to be render-scope aware. A paragraph text change should not conceptually require the same work as a global theme change. Full incremental rendering is not required for the first milestone, but the architecture must not close the door on it.

## Components and templates

The component vocabulary is intentionally constrained and reusable. Initial component types may include:

- paragraph;
- heading;
- definition;
- callout;
- table;
- formula;
- image;
- source/reference.

Components are the vocabulary. The template is the visual language.

In 0.5, templates should control document-wide presentation such as A4 sizing, margins, fonts, colors, cover, background, spacing, and component visual defaults.

Do not build an open-ended component designer or a freeform canvas in this milestone. The document language should stay controlled so output remains coherent.

## AI and prompts

Washi 0.5 does not generate the educational content itself.

It provides a small Prompt Library so the author can copy prompts into an external AI tool such as ChatGPT, Claude, Gemini, or Kimi, then bring the resulting Markdown back into Washi.

The initial prompt organization is:

```text
Prompt Library
├── Global Rules
├── Subject Rules
├── Chapter Rules
└── Formatting Rules
```

Useful prompt actions for 0.5:

- create;
- edit;
- duplicate;
- version;
- test.

Do not add provider profiles, an AI comparison system, an AI marketplace, or integrated AI orchestration to 0.5.

## Validation

Structural validation is required. It should detect issues such as:

- malformed Markdown;
- an unclosed `:::formula` or other block;
- an unknown component;
- an invalid schema;
- a missing asset.

Content validation is outside Washi’s responsibility for now. Washi confirms that a document is syntactically/structurally valid; it does not claim that the educational content is scientifically correct. External AI helps produce drafts, and the human remains the final reviewer.

## Source tracing / provenance

Each semantic block should be able to carry hidden provenance metadata, visible only in Admin/Debug views. The intended granularity is:

```text
source
├── document
├── pages
├── paragraphs
└── regions
```

A block may eventually contain multiple provenance references. The exact serialized representation does not need to be over-designed before the first real use case is implemented.

## History

History is needed because people make mistakes. For 0.5 use snapshot-based history:

```text
v1 → v2 → v3 → v4
```

Important saves create snapshots, and the user can restore a previous snapshot.

Do not turn history into Git, collaboration, branches, or an advanced diff system in this milestone.

## Publishing

Publishing means freezing a reviewed draft:

```text
Draft
 ↓
Human Review
 ↓
Publish
 ↓
Immutable Content Package
```

Once published, the educational platform does not edit the content. The author owns the publish decision.

## Publication Package

The logical publication artifact should keep the related outputs together:

```text
Publication Package
├── content.md
├── document.ast
├── app-content.json
├── document.pdf
├── assets/
└── metadata/
```

Not every artifact must be shown to students. The important rule is that the PDF, platform content model, AST, metadata, and assets are tied to the same immutable publication.

## Boundary with the educational platform

Washi is the authoring/publishing system.

The platform is the consumption/intelligence system. It should be able to:

- display a definition;
- connect a question to a concept;
- connect a flashcard to a concept;
- record where a student made a mistake;
- use the same structured content for reading and learning features.

The platform should say “show this definition” rather than “edit this definition.”

## Explicit non-goals for Washi 0.5

Do not build these as part of this milestone:

- a complete AI SaaS;
- marketplace features;
- collaboration or multi-user editing;
- payments;
- a cloud-storage ecosystem;
- provider integrations;
- AI training;
- a real template marketplace;
- automatic ingestion for every source type;
- a freeform canvas or open component designer.

When a requested feature falls in this list, record it as future work unless it is strictly necessary to prove the 0.5 pipeline.

## End-to-end definition of done

The milestone is complete when one real competitive-exam chapter can go through this path:

```text
External AI
   ↓
Markdown
   ↓
Washi import/parse
   ↓
Human editing
   ↓
Structural validation
   ↓
Takumi-based preview
   ↓
PDF export
   ↓
Publish/freeze
   ↓
Publication Package
   ↓
Educational Platform consumption
```

The resulting workflow must demonstrate:

- attractive and consistent output;
- acceptable production speed;
- editable source;
- reproducible PDF builds;
- stable rendering;
- structural validation;
- hidden provenance tracking;
- snapshot recovery;
- an immutable publication package;
- platform-usable structured content.

## Initial Codex working rules

1. Start by inspecting the repository and identifying what already exists.
2. Preserve the milestone boundary above when choosing implementation details.
3. Prefer the smallest vertical slice that proves the full pipeline with one real chapter.
4. Keep Markdown as the content source and keep presentation concerns separate.
5. Do not add future SaaS features merely because they might be useful later.
6. When a decision is not specified, choose the simplest reversible engineering option that supports the definition of done.
7. Record meaningful architectural decisions in documentation as the implementation evolves.
8. Before declaring success, exercise the complete import → edit → preview → PDF → publish flow.

## First implementation target

Build a thin vertical slice for one chapter:

1. define the smallest supported Markdown/component syntax;
2. parse it into an AST;
3. validate structure and assets;
4. render a preview and PDF through the intended render path;
5. support one human-edit cycle;
6. export a minimal immutable Publication Package;
7. expose enough structured content for a platform consumer test.

Do not broaden the scope until this slice works end to end.
