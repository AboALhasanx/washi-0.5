/**
 * lib/prompt-package.ts
 * ONE complete production prompt — every section always included.
 * Not a stack of copies. Not fragment-by-selection.
 */

export interface PackageSourceMeta {
  title: string;
  document: string;
  pages: string;
  subject?: string;
  language?: "ar" | "en";
}

export interface PackagePromptPart {
  id?: number;
  title: string;
  body: string;
  category?: "global" | "subject" | "chapter" | "formatting";
}

export interface AssembleInput {
  meta: PackageSourceMeta;
  prompts: PackagePromptPart[];
  sourceText: string;
}

/** Filename-safe slug for downloads. */
export function packageSlug(title: string): string {
  const t = (title || "washi-chapter").trim().slice(0, 48);
  const s = t
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "washi-chapter";
}

/**
 * The complete Networks chapter production prompt.
 * Every section is always present — one file, one voice, no fragments.
 * `prompts` is accepted for API compatibility; extra unknown bodies are
 * appended once under an appendix if the caller passed custom text.
 */
export function assemblePromptPackage(input: AssembleInput): string {
  const { meta, sourceText } = input;
  const subject = meta.subject?.trim() || "computer-networks";
  const pages = meta.pages.trim() || "1";
  const document = meta.document.trim() || "Source.pdf";
  const title = meta.title.trim() || "فصل جديد";
  const lang = meta.language ?? "ar";
  const isNetworks = subject === "computer-networks";
  const firstPage = pages.split(",")[0]?.trim() || "1";

  const L: string[] = [];

  /* ═══════════════ HEADER ═══════════════ */
  L.push(`# واشي — أمر إنتاج فصل كامل (Prompt مدمج)`);
  L.push("");
  L.push(
    `> **هذا ملف واحد مكتمل.** لا تطلب شرحاً إضافياً. لا تخرج إلا ملف \`content.md\` النهائي.`
  );
  L.push("");
  L.push(`| | |`);
  L.push(`|---|---|`);
  L.push(`| المنصة | Washi 0.5 — ناشر فصول تعليمية عربي |`);
  L.push(`| المادة | \`${subject}\`${isNetworks ? " — شبكات الحاسوب" : ""} |`);
  L.push(`| العنوان | ${title} |`);
  L.push(`| المستند | ${document} |`);
  L.push(`| الصفحات المسموحة | ${pages} |`);
  L.push(`| اللغة | ${lang} |`);
  L.push("");

  /* ═══════════════ ROLE ═══════════════ */
  L.push(`## الدور`);
  L.push("");
  L.push(
    `أنت **معدّ محتوى أكاديمي** متخصص${isNetworks ? " في شبكات الحاسوب" : ""}. تحوّل نص المصدر إلى فصل دراسي عربي جاهز للنشر: دقيق في العلم، واضح في الشرح، ملتزم بعقد واشي حرفياً.`
  );
  L.push("");

  /* ═══════════════ OUTPUT RULE ═══════════════ */
  L.push(`## قاعدة الخرج الوحيدة`);
  L.push("");
  L.push(`- أخرج **ملف \`content.md\` واحداً فقط**.`);
  L.push(`- بلا مقدمات («بالتأكيد…»)، بلا اعتذارات، بلا شرح بعد الملف.`);
  L.push(`- إن احتجت تفكيراً فاجعله داخلياً — لا يظهر في الخرج.`);
  L.push(`- ابدأ حرفياً بـ \`---\` (بداية الـfrontmatter).`);
  L.push("");

  /* ═══════════════ FRONTMATTER ═══════════════ */
  L.push(`## ١. الـfrontmatter (إلزامي — أول الملف)`);
  L.push("");
  L.push("```yaml");
  L.push("---");
  L.push(`subject: ${subject}`);
  L.push(`title: "${title}"`);
  L.push(`language: ${lang}`);
  L.push("sources:");
  L.push(`  - document: "${document}"`);
  L.push(`    pages: [${pages}]`);
  L.push("---");
  L.push("```");
  L.push("");
  L.push(`لا تضف حقولاً أخرى. لا \`theme\`. لا مصادر وهمية.`);
  L.push("");

  /* ═══════════════ PROVENANCE ═══════════════ */
  L.push(`## ٢. التتبع (Provenance) — قلب عقد واشي`);
  L.push("");
  L.push(`قبل **كل** قسم H2 منقول من المصدر:`);
  L.push("");
  L.push("```markdown");
  L.push(`<!-- source: ${document} p.${firstPage} -->`);
  L.push("```");
  L.push("");
  L.push(`- استعمل فقط الأرقام المذكورة في \`pages\` أعلاه.`);
  L.push(`- عدة صفحات: \`p.1,2,3\` أو تعليقان منفصلان.`);
  L.push(`- **محتوى مولّد** (أسئلة، بطاقات، خلاصة، تدقيق ذاتي) يبدأ بـ:`);
  L.push("```markdown");
  L.push("<!-- source: (generated) -->");
  L.push("```");
  L.push("");
  L.push(`**ممنوع قطعياً:**`);
  L.push(`- اختراع صفحة غير واردة`);
  L.push(`- نسب معلومة للمصدر دون أن ترد فيه`);
  L.push(`- قسم تعليمي بلا تعليق source إطلاقاً`);
  L.push("");

  /* ═══════════════ STRUCTURE ═══════════════ */
  L.push(`## ٣. هيكل الملف الكامل (كل الأقسام — بهذا الترتيب)`);
  L.push("");
  L.push("```text");
  L.push("--- frontmatter ---");
  L.push(`# ${title}`);
  L.push("");
  L.push("## نظرة عامة");
  L.push("## المفاهيم الأساسية");
  L.push("## الشرح التفصيلي");
  L.push("## أمثلة محلولة");
  L.push("## التعاريف");
  L.push("## خلاصة سريعة");
  L.push("## أسئلة مراجعة");
  L.push("## بطاقات المراجعة");
  L.push("## تدقيق المصادر");
  L.push("```");
  L.push("");
  L.push(`### ٣.١ نظرة عامة`);
  L.push(
    `فقرتان: (١) لماذا هذا الفصل مهم في المادة${isNetworks ? " (الشبكات أساس الاتصال الرقمي)" : ""}. (٢) أهداف: مفاهيمي — تحليلي — تطبيقي.`
  );
  L.push("");
  L.push(`### ٣.٢ المفاهيم الأساسية`);
  L.push(`**٣ إلى ٦** تعريفات. كل واحد بصيغة واشي الدقيقة:`);
  L.push("");
  L.push("```markdown");
  L.push(`> [!NOTE] **Bandwidth (عرض النطاق):** تعريف دقيق مأخوذ من المصدر…`);
  L.push("```");
  L.push("");
  L.push(`الصيغة: \`> [!NOTE] **العربي (English):** التعريف.\``);
  L.push(`لا تكتب تعريفاً كنص عادي خارج الـblockquote.`);
  L.push("");
  L.push(`### ٣.٣ الشرح التفصيلي`);
  L.push(`**٣ إلى ٧** أقسام H2 حسب تسلسل المصدر. كل قسم:`);
  L.push(`- تعليق source`);
  L.push(`- شرح بالعربية الفصحى`);
  L.push(`- مصطلح إنجليزي عند أول ذكر`);
  L.push(`- مثال واقعي${isNetworks ? " (LAN مبنى، WAN مدن، TCP/IP، latency)" : ""}`);
  if (isNetworks) {
    L.push(`- يجب أن يغطي إن وردت: مكوّنات الشبكة · LAN/MAN/WAN · bandwidth/latency/throughput · نماذج الطبقات · Client/Server`);
  }
  L.push("");
  L.push(`### ٣.٤ أمثلة محلولة`);
  L.push(`إن وجدت في المصدر فقط. شكل:`);
  L.push("```markdown");
  L.push("> [!EXAMPLE] **مثال:** المسألة… الحل…");
  L.push("```");
  L.push(`إن لم يوجد في المصدر: قسم قصير يقول «لا أمثلة محسوبة في الصفحات المحددة» مع source.`);
  L.push("");
  L.push(`### ٣.٥ التعاريف`);
  L.push(`جدول أو قائمة مصطلحات التنافسي المتكررة (عربي + إنجليزي + سطر تعريف).`);
  L.push("");
  L.push(`### ٣.٦ خلاصة سريعة`);
  L.push(`٥–٨ نقاط bullet. لا فقرة طويلة.`);
  L.push("");
  L.push(`### ٣.٧ أسئلة مراجعة (إلزامي)`);
  L.push("```markdown");
  L.push("<!-- source: (generated) -->");
  L.push("## أسئلة مراجعة");
  L.push("");
  L.push("1. **نص السؤال؟**");
  L.push("   - أ) …");
  L.push("   - ب) …");
  L.push("   - ج) …");
  L.push("   - د) …");
  L.push("   الإجابة: أ — سبب مختصر من الفصل.");
  L.push("```");
  L.push("");
  L.push(`**٦ إلى ١٠** أسئلة: تذكير + فهم + تطبيق. كل سؤال يرتبط بمفهوم ظهر فعلاً.`);
  L.push("");
  L.push(`### ٣.٨ بطاقات المراجعة (إلزامي)`);
  L.push("```markdown");
  L.push("<!-- source: (generated) -->");
  L.push("## بطاقات المراجعة");
  L.push("");
  L.push("| المقدمة (Q) | الخلف (A) |");
  L.push("|-------------|-----------|");
  L.push("| ما تعريف …؟ | … |");
  L.push("```");
  L.push("");
  L.push(`**٨ إلى ٢٠** بطاقة من نص الفصل فقط.`);
  L.push("");
  L.push(`### ٣.٩ تدقيق المصادر (إلزامي — تقرير ذاتي قصير)`);
  L.push("```markdown");
  L.push("<!-- source: (generated) -->");
  L.push("## تدقيق المصادر");
  L.push("");
  L.push("- عدد الأقسام بتعليق source: N");
  L.push("- صفحات مستعملة: …");
  L.push("- ملاحظات: (إن وجدت معلومة هشة أو محتوى مولّد)");
  L.push("```");
  L.push("");

  /* ═══════════════ COMPONENTS ═══════════════ */
  L.push(`## ٤. صيغة المكوّنات (يقرأها محرّك واشي حرفياً)`);
  L.push("");
  L.push(`| المكوّن | الصيغة |`);
  L.push(`|---------|--------|`);
  L.push(`| تعريف | \`> [!NOTE] **Term:** def\` |`);
  L.push(`| مهم | \`> [!IMPORTANT] **…:** …\` |`);
  L.push(`| تحذير | \`> [!WARNING] **خطر شائع:** …\` |`);
  L.push(`| مثال | \`> [!EXAMPLE] **مثال:** …\` |`);
  L.push(`| نصيحة | \`> [!TIP] …\` |`);
  L.push(`| معادلة عرض | \`$$ … $$\` |`);
  L.push(`| معادلة سطر | \`$ … $\` |`);
  L.push(`| جدول | صف رأس + صفوف · نسب \`40%\` |`);
  L.push(`| كود | \`\`\`lang … \`\`\` |`);
  L.push("");
  if (isNetworks) {
    L.push(`**معادلة Shannon إن وردت:**`);
    L.push("```latex");
    L.push("C = B \\log_2(1 + S/N)");
    L.push("```");
    L.push("");
  }
  L.push(`**بلا HTML معقد · بلا أكثر من H1 · بلا قوائم متداخلة عميقة · بلا اقتباسات شعرية زائدة.`);
  L.push("");

  /* ═══════════════ SUBJECT ═══════════════ */
  if (isNetworks) {
    L.push(`## ٥. خصوصية شبكات الحاسوب`);
    L.push("");
    L.push(`- **الشبكة ≠ الإنترنت** — اشرح الفرق إن ورد.`);
    L.push(`- المصطلحات بالعربية ثم الإنجليزي: (Sender, Receiver, Protocol, Server, Client, Throughput, Latency).`);
    L.push(`- أمثلة من الواقع: شبكة مبنى (LAN)، ربط مدن (WAN)، طبقة تطبيق/نقل/شبكة/فيزيائية إن وردت.`);
    L.push(`- مستوى: سنة أولى/ثانية جامعية.`);
    L.push(`- لا تدخل في تفاصيل بروتوكول لم يذكره المصدر.`);
    L.push("");
  }

  /* ═══════════════ ARABIC QUALITY ═══════════════ */
  L.push(`## ٦. جودة اللغة`);
  L.push("");
  L.push(`- فصحى واضحة، جمل متوسطة، بلا تكرار.`);
  L.push(`- الأرقام في السياق العربي: ١٢٣ أو 123 — كن متسقاً داخل الملف.`);
  L.push(`- لا لهجة عامية.`);
  L.push(`- لا عبارات تسويقية («رائع!»، «مذهل»).`);
  L.push("");

  /* ═══════════════ SELF-CHECK ═══════════════ */
  L.push(`## ٧. قائمة التحقق قبل التسليم (نفّذها داخلياً)`);
  L.push("");
  L.push("```text");
  L.push("[ ] يبدأ بـ --- frontmatter صحيح");
  L.push(`[ ] H1 واحد = العنوان`);
  L.push("[ ] كل H2 تقريباً له <!-- source -->");
  L.push("[ ] أسئلة مراجعة موجودة وبـ (generated)");
  L.push("[ ] بطاقات مراجعة موجودة وبـ (generated)");
  L.push("[ ] تدقيق المصادر موجود");
  L.push("[ ] التعريفات بصيغة [!NOTE] **Term:**");
  L.push("[ ] لا صفحة خارج pages");
  L.push("[ ] لا معلومة بلا مصدر");
  L.push("[ ] لا نص خارج content.md");
  L.push("```");
  L.push("");

  /* ═══════════════ SOURCE ═══════════════ */
  L.push(`---`);
  L.push("");
  L.push(`## ٨. المصدر`);
  L.push("");
  L.push("```text");
  L.push(sourceText.trim() || "(لا يوجد نص مصدر)");
  L.push("```");
  L.push("");

  /* ═══════════════ CLOSE ═══════════════ */
  L.push(`---`);
  L.push("");
  L.push(`## أمر ختامي`);
  L.push("");
  L.push(
    `الآن أخرج **\`content.md\` كاملاً** الذي يحقق كل البنود أعلاه. لا تعلّق. لا تفسّر. الملف فقط.`
  );

  return L.join("\n").trim() + "\n";
}

/** Starter content.md scaffold with frontmatter filled. */
export function buildContentScaffold(meta: PackageSourceMeta): string {
  const subject = meta.subject?.trim() || "computer-networks";
  const pages = meta.pages.trim() || "1";
  const document = meta.document.trim() || "Source.pdf";
  const title = meta.title.trim() || "فصل جديد";
  return [
    "---",
    `subject: ${subject}`,
    `title: "${title}"`,
    `language: ${meta.language ?? "ar"}`,
    "sources:",
    `  - document: "${document}"`,
    `    pages: [${pages}]`,
    "---",
    "",
    `# ${title}`,
    "",
    `<!-- source: ${document} p.${pages.split(",")[0]?.trim() || "1"} -->`,
    "## نظرة عامة",
    "",
    "…",
    "",
    `<!-- source: ${document} p.${pages.split(",")[0]?.trim() || "1"} -->`,
    "## المفاهيم الأساسية",
    "",
    "> [!NOTE] **المصطلح (Term):** …",
    "",
    "## الشرح التفصيلي",
    "",
    "…",
    "",
    "## أمثلة محلولة",
    "",
    "…",
    "",
    "## التعاريف",
    "",
    "…",
    "",
    "## خلاصة سريعة",
    "",
    "- …",
    "",
    "<!-- source: (generated) -->",
    "## أسئلة مراجعة",
    "",
    "1. **سؤال؟**",
    "   - أ) …",
    "   الإجابة: أ — …",
    "",
    "<!-- source: (generated) -->",
    "## بطاقات المراجعة",
    "",
    "| Q | A |",
    "|---|---|",
    "| … | … |",
    "",
    "<!-- source: (generated) -->",
    "## تدقيق المصادر",
    "",
    "- عدد الأقسام بتعليق source: …",
    "",
  ].join("\n");
}

/** Kept for API/UI compatibility — selection no longer fragments output. */
export const NETWORKS_DEFAULT_PRESET_MATCH = [
  "قواعد عامة",
  "هيكل فصل",
  "شبكات",
  "تنسيق",
];
