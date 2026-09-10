/**
 * lib/theme-server.ts
 * Server-side persistence for the Studio: themes, app settings, and build
 * history — plain JSON files under .washi/ (project root).
 */

import fs from "node:fs";
import path from "node:path";
import { StudioTheme, mergeTheme } from "./theme";
import { parseTemplateFile } from "./schemas";

const DATA_DIR = path.join(process.cwd(), ".washi");
const THEMES_DIR = path.join(DATA_DIR, "themes");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const BUILDS_FILE = path.join(DATA_DIR, "builds.json");

function ensureDirs() {
  fs.mkdirSync(THEMES_DIR, { recursive: true });
}

const safeName = (n: string) =>
  n.replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s+/g, "-").toLowerCase() || "theme";

/* ─── Themes ─── */

export function listThemes(): StudioTheme[] {
  ensureDirs();
  return fs
    .readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return mergeTheme(JSON.parse(fs.readFileSync(path.join(THEMES_DIR, f), "utf8")));
      } catch {
        return null;
      }
    })
    .filter(Boolean) as StudioTheme[];
}

/**
 * Validate BEFORE mergeTheme. mergeTheme spreads whatever it is handed, so
 * `mergeTheme("hello")` quietly yields a theme with keys 0..4 instead of
 * failing — garbage would be written to disk and only surface as a broken PDF
 * much later. Rejecting here keeps template.json structurally sound.
 */
export function saveTheme(theme: any): StudioTheme {
  ensureDirs();
  const merged = mergeTheme(parseTemplateFile(theme, "template.json"));
  merged.id = safeName(merged.id || merged.name);
  fs.writeFileSync(path.join(THEMES_DIR, `${merged.id}.json`), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

export function deleteTheme(id: string): boolean {
  ensureDirs();
  const p = path.join(THEMES_DIR, `${safeName(id)}.json`);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    return true;
  }
  return false;
}

/* ─── Settings ─── */

export interface StudioSettings {
  defaultLanguage: "ar" | "en";
  defaultSubject: string;
  editorFontSize: number;
  autoPreview: boolean;
  provider: string;
  model: string;
  uiTheme: "system" | "light" | "dark";
}

export const DEFAULT_SETTINGS: StudioSettings = {
  defaultLanguage: "ar",
  defaultSubject: "software-engineering",
  editorFontSize: 13,
  autoPreview: true,
  provider: "openai",
  model: "gpt-4o-mini",
  uiTheme: "system",
};

export function loadSettings(): StudioSettings {
  ensureDirs();
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch: Partial<StudioSettings>): StudioSettings {
  const merged = { ...loadSettings(), ...patch };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

/* ─── Build history ─── */

export interface BuildRecord {
  title: string;
  bytes: number;
  ms: number;
  themeId: string;
  engine: string;
  at: string;
}

export function recordBuild(rec: BuildRecord): void {
  ensureDirs();
  const list = loadBuilds();
  list.unshift(rec);
  fs.writeFileSync(BUILDS_FILE, JSON.stringify(list.slice(0, 100), null, 2), "utf8");
}

export function loadBuilds(): BuildRecord[] {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(BUILDS_FILE, "utf8"));
  } catch {
    return [];
  }
}
