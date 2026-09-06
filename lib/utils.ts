/**
 * lib/utils.ts — cn() helper (clsx + tailwind-merge style, dependency-free)
 * Minimal implementation: handles string | boolean | undefined | null | Record<string, boolean> | array.
 * Deduplicates tailwind conflicting classes via last-wins simple strategy (no external deps).
 */

type ClassValue =
  | string
  | boolean
  | undefined
  | null
  | Record<string, boolean>
  | ClassValue[];

function toClassArray(value: ClassValue, out: string[]): void {
  if (!value) return;
  if (typeof value === "string") {
    if (value.trim()) out.push(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) toClassArray(v, out);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, boolean>)) {
      if (v) out.push(k);
    }
  }
}

function dedupeTailwind(classes: string[]): string {
  // Simple last-wins dedupe for tailwind conflict groups.
  // Groups by prefix like p-, m-, text-, bg-, border-, rounded-, etc.
  // Not exhaustive, but preserves last occurrence for same utility prefix.
  const seen = new Map<string, string>();
  const order: string[] = [];
  // Split input string into tokens first
  const tokens = classes.join(" ").split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    // Derive group key: first segment before - or full token for non-tailwind
    // e.g., p-4 -> p, text-sm -> text, bg-background -> bg, border -> border, flex -> flex
    const dash = token.indexOf("-");
    const key = dash > 0 ? token.slice(0, dash) : token;
    // For true merging, tw-merge would handle conflicts within same group; we approximate by key
    // To avoid over-deduping unrelated utilities sharing prefix (e.g., text-primary vs text-sm),
    // we use a more specific key: prefix + variant count heuristic
    // Simplified: use full token's prefix group map for common conflicts
    const conflictGroups = [
      "p", "px", "py", "pt", "pr", "pb", "pl",
      "m", "mx", "my", "mt", "mr", "mb", "ml",
      "gap", "space",
      "w", "h", "min", "max",
      "text", "font", "leading", "tracking",
      "bg", "border", "rounded", "shadow",
      "flex", "grid", "items", "justify", "overflow", "opacity",
    ];
    let groupKey = token;
    // Check if token starts with known prefix
    for (const g of conflictGroups) {
      if (token === g || token.startsWith(g + "-") || token.startsWith(g + "[")) {
        // Use prefix as group key so last wins within same prefix family
        // For text- we need finer granularity: text size vs text color share prefix but different
        // So keep full prefix for text- subcase? Use first two parts.
        if (g === "text" && token.startsWith("text-")) {
          // Differentiate size (text-sm, text-xs) vs color (text-foreground etc.)
          // Size tokens are text-{xs,sm,base,lg,xl...} vs color tokens are text-{primary,...}
          const sizeRe = /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|\[.*\])$/;
          groupKey = sizeRe.test(token) ? "text-size" : "text-color-" + token;
        } else {
          groupKey = g;
        }
        break;
      }
    }
    if (seen.has(groupKey)) {
      // move to end (last wins)
      const prev = seen.get(groupKey)!;
      const idx = order.indexOf(prev);
      if (idx !== -1) order.splice(idx, 1);
    }
    seen.set(groupKey, token);
    order.push(token);
  }
  // Rebuild respecting last occurrence order, but output in encounter order of last wins
  // Deduplicate exact duplicates as well
  const unique = Array.from(new Set(order));
  // However our order already is last-wins; we need to sort by last appearance.
  // Already handled by splicing.
  return unique.join(" ");
}

export function cn(...inputs: ClassValue[]): string {
  const buf: string[] = [];
  for (const input of inputs) toClassArray(input, buf);
  if (buf.length === 0) return "";
  return dedupeTailwind(buf);
}

export default cn;
