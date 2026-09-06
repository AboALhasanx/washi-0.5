import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

const downloads = "C:/Users/gokoq/Downloads";
const fileName = fs.readdirSync(downloads).find((f) => f.includes("جابتر9"));
if (!fileName) {
  console.error("chapter file not found in Downloads");
  process.exit(1);
}
const filePath = path.join(downloads, fileName);
console.log("file:", fileName);

const buf = fs.readFileSync(filePath);
const out = await pdfParse(buf, { max: 0 });
fs.mkdirSync("content", { recursive: true });
fs.writeFileSync("content/chapter9-raw.txt", out.text, "utf8");
console.log("pages:", out.numpages, "| chars:", out.text.length);
