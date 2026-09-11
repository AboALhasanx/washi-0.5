/**
 * lib/provenance.ts
 * P3 — single ownership for provenance → display caption.
 * Semantic data in; one canonical string out. No second caption system.
 */

export interface ProvenanceInput {
  /** Parsed source node fields */
  raw?: string;
  document?: string;
  pages?: number[];
  /** Free-text source copied onto content nodes (parser pendingSource) */
  source?: string;
  kind?: "source-derived" | "generated" | "authored" | "edited";
}

const GENERATED_MARK = "(generated)";

function cleanRaw(raw: string): string {
  return raw
    .replace(/<!--/g, "")
    .replace(/-->/g, "")
    .replace(/^\s*source\s*:?\s*/i, "")
    .trim();
}

/**
 * Canonical caption. Always:
 *   Source: Document · p. 1,2
 *   Source: <cleaned raw>
 *   Source: (generated)
 * Never double-prefixes. Empty string when nothing to show.
 */
export function formatProvenance(input: ProvenanceInput | null | undefined): string {
  if (!input) return "";
  const { raw, document, pages, source, kind } = input;

  if (kind === "generated") {
    return `Source: ${GENERATED_MARK}`;
  }

  if (document) {
    if (pages && pages.length) {
      return `Source: ${document} · p. ${pages.join(", ")}`;
    }
    return `Source: ${document}`;
  }

  // Free-text node.source (may already include document/p.N from the comment)
  if (source && source.trim()) {
    const cleaned = cleanRaw(source);
    if (!cleaned) return "";
    if (cleaned.toLowerCase().startsWith("source:")) {
      // Already prefixed — normalize to canonical casing only
      return `Source:${cleaned.slice(cleaned.indexOf(":") + 1)}`;
    }
    if (cleaned === GENERATED_MARK || cleaned.toLowerCase() === "generated") {
      return `Source: ${GENERATED_MARK}`;
    }
    return `Source: ${cleaned}`;
  }

  if (raw && raw.trim()) {
    const cleaned = cleanRaw(raw);
    if (!cleaned) return "";
    if (cleaned.toLowerCase().startsWith("source:")) {
      return `Source:${cleaned.slice(cleaned.indexOf(":") + 1)}`;
    }
    return `Source: ${cleaned}`;
  }

  return "";
}

/** True when this provenance means generated / no source document. */
export function isGeneratedProvenance(input: ProvenanceInput | null | undefined): boolean {
  if (!input) return false;
  if (input.kind === "generated") return true;
  const s = (input.source ?? input.raw ?? "").toLowerCase();
  return s.includes(GENERATED_MARK) || /source\s*:?\s*generated/i.test(s);
}
