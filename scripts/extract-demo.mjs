const pdfPath = process.argv[2];
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
const fs = await import('node:fs');
const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await getDocument({ data, useSystemFonts: true }).promise;
console.log('PAGES:', doc.numPages);
let out = '';
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const tc = await page.getTextContent();
  const text = tc.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
  out += `\n=== PAGE ${i} ===\n` + text + '\n';
}
fs.writeFileSync('content/chapter9-raw.txt', out, 'utf8');
console.log('chars:', out.length);
