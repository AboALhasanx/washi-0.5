/**
 * lib/prompt-package.ts
 * ONE long standalone master prompt for Washi chapter production.
 * No file upload. No embedded source. You copy this prompt, paste it
 * into ChatGPT/Claude, then paste your PDF text in the same chat.
 */

export interface PackageSourceMeta {
  title?: string;
  document?: string;
  subject?: string;
  language?: "ar" | "en";
}

export interface PackagePromptPart {
  id?: number;
  title: string;
  body: string;
}

export interface AssembleInput {
  meta?: PackageSourceMeta;
  prompts?: PackagePromptPart[];
  sourceText?: string;
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
 * The complete Washi master prompt — long, standalone, production-ready.
 * Placeholders: {{TITLE}} {{DOCUMENT}} if provided in meta.
 */
export function assemblePromptPackage(input: AssembleInput = {}): string {
  const meta = input.meta ?? {};
  const title = meta.title?.trim() || "{{عنوان الفصل}}";
  const document = meta.document?.trim() || "{{اسم الملف.pdf}}";
  const subject = meta.subject?.trim() || "computer-networks";
  const lang = meta.language ?? "ar";
  const isNetworks = subject === "computer-networks";

  const L: string[] = [];

  L.push(`# برومبت واشي الشامل — إنتاج فصل تعليمي كامل`);
  L.push("");
  L.push(`> الصق هذا الـprompt في الـAI، ثم ألصق **نص المصدر** (المحاضرة/الـPDF) بعده.`);
  L.push(`> أخرج ملف \`content.md\` واحداً فقط — بلا شرح.`);
  L.push("");

  /* ── 1 Role ── */
  L.push(`## ١. الدور`);
  L.push("");
  L.push(
    `أنت **معدّ محتوى أكاديمي محترف** لمنصة **واشي (Washi 0.5)** — ناشر فصول تعليمية عربي local-first: Markdown → PDF مرتّب → حزمة نشر مختمة قابلة للتتبع.`
  );
  L.push("");
  L.push(`مهمتك: تحويل **نص المصدر** الذي سألصقه لك إلى **فصل دراسي واحد** جاهز للنشر.`);
  L.push("");
  L.push(`| | |`);
  L.push(`|---|---|`);
  L.push(`| المنصة | Washi 0.5 |`);
  L.push(`| المادة | \`${subject}\`${isNetworks ? " — شبكات الحاسوب" : ""} |`);
  L.push(`| العنوان | ${title} |`);
  L.push(`| اسم المستند | ${document} |`);
  L.push(`| اللغة | ${lang} |`);
  L.push(`| نطاق الصفحات | **المصدر كله** — بلا قيد |`);
  L.push("");

  /* ── 2 Hard rules ── */
  L.push(`## ٢. قواعد غير قابلة للتفاوض`);
  L.push("");
  L.push(`1. أخرج **ملف \`content.md\` واحداً فقط**.`);
  L.push(`2. ابدأ حرفياً بـ \`---\` (بداية الـfrontmatter).`);
  L.push(`3. بلا مقدمات («بالتأكيد»، «إليك»)، بلا اعتذارات، بلا شرح بعد الملف.`);
  L.push(`4. إن احتجت تفكيراً فداخلياً — لا يظهر.`);
  L.push(`5. **لا تهلوس**: كل معلومة منقولة من المصدر. إن لم ترد، احذفها أو علّمها generated.`);
  L.push(`6. **لا تخترع أرقام صفحات** غير ظاهرة في النص.`);
  L.push(`7. العربية الفصحى + المصطلح الإنجليزي بين قوسين عند أول ذكر.`);
  L.push(`8. بلا HTML معقد · بلا أكثر من H1 · بلا قوائم متداخلة عميقة.`);
  L.push(`9. بلا لهجة عامية · بلا عبارات تسويقية («رائع!»).`);
  L.push(`10. المصدر المرفق (الذي سألصقه بعدك) هو المرجع الوحيد عملياً.`);
  L.push("");

  /* ── 3 Frontmatter ── */
  L.push(`## ٣. الـfrontmatter (إلزامي — أول الملف)`);
  L.push("");
  L.push("```yaml");
  L.push("---");
  L.push(`subject: ${subject}`);
  L.push(`title: "${title}"`);
  L.push(`language: ${lang}`);
  L.push("sources:");
  L.push(`  - document: "${document}"`);
  L.push(`    pages: [1]`);
  L.push("---");
  L.push("```");
  L.push("");
  L.push(
    `> \`pages: [1]\` في واشي = **مرجع كامل المستند** عند عدم تحديد صفحات — ليس ادعاء أن المحتوى صفحة واحدة. لا تغيّره إلا إذا ظهرت أرقام صفحات حقيقية في النص وتريد ربطها.`
  );
  L.push("");
  L.push(`**ممنوع:** \`theme\` · مصادر وهمية · حقول إضافية غير المذكورة.`);
  L.push("");

  /* ── 4 Provenance ── */
  L.push(`## ٤. التتبع (Provenance) — قلب عقد واشي`);
  L.push("");
  L.push(`قبل **كل** قسم \`##\` منقول من المصدر:`);
  L.push("");
  L.push("```markdown");
  L.push(`<!-- source: ${document} p.1 -->`);
  L.push("```");
  L.push("");
  L.push(`- إن ظهر رقم صفحة واضح في النص (مثل \`p.12\`) يمكنك استبدال \`p.1\` به.`);
  L.push(`- محتوى **مولّد** (أسئلة، بطاقات، خلاصة، تدقيق ذاتي):`);
  L.push("");
  L.push("```markdown");
  L.push("<!-- source: (generated) -->");
  L.push("```");
  L.push("");
  L.push(`**ممنوع قطعياً:**`);
  L.push(`- اختراع صفحة`);
  L.push(`- نسب معلومة للمصدر دون أن ترد فيه`);
  L.push(`- قسم تعليمي بلا تعليق source إطلاقاً`);
  L.push(`- نسخ معلومة من معرفتك العامة ونسبتها للمصدر`);
  L.push("");

  /* ── 5 Structure ── */
  L.push(`## ٥. هيكل الفصل (كل الأقسام — بهذا الترتيب)`);
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

  L.push(`### ٥.١ نظرة عامة`);
  L.push(`فقرتان: (١) لماذا الفصل مهم${isNetworks ? " (الشبكات أساس الاتصال الرقمي)" : ""}. (٢) أهداف: مفاهيمي — تحليلي — تطبيقي.`);
  L.push("");

  L.push(`### ٥.٢ المفاهيم الأساسية`);
  L.push(`**٣–٦** تعريفات بالصيغة الدقيقة:`);
  L.push("");
  L.push("```markdown");
  L.push("> [!NOTE] **Bandwidth (عرض النطاق):** التعريف الدقيق من المصدر…");
  L.push("```");
  L.push("");
  L.push(`الصيغة: \`> [!NOTE] **العربي (English):** التعريف.\``);
  L.push(`**ممنوع** تعريف كنص عادي خارج الـblockquote.`);
  L.push("");

  L.push(`### ٥.٣ الشرح التفصيلي`);
  L.push(`**٣–٧** أقسام H2 حسب تسلسل المصدر. كل قسم:`);
  L.push(`- تعليق source`);
  L.push(`- شرح فصيح متوسط الجمل`);
  L.push(`- مصطلح EN عند أول ذكر`);
  L.push(`- مثال واقعي قصير`);
  if (isNetworks) {
    L.push(`- غطِّ إن ورد: مكوّنات الشبكة · LAN/MAN/WAN · bandwidth/latency/throughput · نماذج الطبقات · Client/Server · TCP/IP`);
  }
  L.push("");

  L.push(`### ٥.٤ أمثلة محلولة`);
  L.push("```markdown");
  L.push("> [!EXAMPLE] **مثال:** المسألة… الحل…");
  L.push("```");
  L.push(`إن لم توجد أمثلة في المصدر: قسم قصير يقول ذلك مع source (لا تختلق مسائل).`);
  L.push("");

  L.push(`### ٥.٥ التعاريف`);
  L.push(`جدول/قائمة المصطلحات المتكررة: عربي + إنجليزي + سطر تعريف.`);
  L.push("");

  L.push(`### ٥.٦ خلاصة سريعة`);
  L.push(`٥–٨ نقاط bullet مكثّفة. بلا فقرة طويلة.`);
  L.push("");

  L.push(`### ٥.٧ أسئلة مراجعة (إلزامي)`);
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
  L.push(`**٦–١٠** أسئلة: تذكير + فهم + تطبيق. كل سؤال مربوط بمفهوم ظهر فعلاً.`);
  L.push("");

  L.push(`### ٥.٨ بطاقات المراجعة (إلزامي)`);
  L.push("```markdown");
  L.push("<!-- source: (generated) -->");
  L.push("## بطاقات المراجعة");
  L.push("");
  L.push("| المقدمة (Q) | الخلف (A) |");
  L.push("|-------------|-----------|");
  L.push("| ما تعريف …؟ | … |");
  L.push("```");
  L.push("");
  L.push(`**٨–٢٠** بطاقة من نص الفصل فقط. إجابات مختصرة دقيقة.`);
  L.push("");

  L.push(`### ٥.٩ تدقيق المصادر (إلزامي)`);
  L.push("```markdown");
  L.push("<!-- source: (generated) -->");
  L.push("## تدقيق المصادر");
  L.push("");
  L.push("- عدد الأقسام بتعليق source: N");
  L.push("- ملاحظات: (هشاشة / محتوى مولّد / معلومة ضعيفة إن وجدت)");
  L.push("```");
  L.push("");

  /* ── 6 Components ── */
  L.push(`## ٦. صيغة المكوّنات (يقرأها محرّك واشي حرفياً)`);
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
    L.push(`**Shannon إن ورد:**`);
    L.push("```latex");
    L.push("C = B \\log_2(1 + S/N)");
    L.push("```");
    L.push("");
  }
  L.push(`- توازن أقواس LaTeX إلزامي`);
  L.push(`- لا تخلط اتجاه الكود مع العربي`);
  L.push(`- جداول مقارنة البروتوكولات/الطبقات مفيدة${isNetworks ? " في الشبكات" : ""}`);
  L.push("");

  /* ── 7 Subject ── */
  if (isNetworks) {
    L.push(`## ٧. خصوصية شبكات الحاسوب`);
    L.push("");
    L.push(`- **الشبكة ≠ الإنترنت** — وضّح الفرق إن ورد.`);
    L.push(`- المصطلحات: (Sender, Receiver, Protocol, Server, Client, Throughput, Latency, Bandwidth).`);
    L.push(`- أمثلة واقعية: شبكة مبنى (LAN)، ربط مدن (WAN)، طبقات إن وردت.`);
    L.push(`- مستوى: سنة أولى/ثانية جامعية.`);
    L.push(`- لا تدخل بروتوكول لم يذكره المصدر.`);
    L.push(`- المعادلات الشائعة: Shannon · أحياناً أزمنة الإرسال إن وردت.`);
    L.push("");
  }

  /* ── 8 Language ── */
  L.push(`## ٨. جودة اللغة العربية`);
  L.push("");
  L.push(`- فصحى واضحة، جمل متوسطة، بلا تكرار ممل.`);
  L.push(`- الأرقام: كن متسقاً (١٢٣ أو 123) داخل الملف.`);
  L.push(`- لا ضربات قلم («طبعاً يا صديقي»).`);
  L.push(`- لا نقل حرفي جامد بلا إعادة صياغة تعليمية — إلا الاقتباسات الحرجة.`);
  L.push("");

  /* ── 9 Self-check ── */
  L.push(`## ٩. قائمة التحقق قبل التسليم (نفّذها داخلياً)`);
  L.push("");
  L.push("```text");
  L.push("[ ] يبدأ بـ --- frontmatter صحيح");
  L.push("[ ] H1 واحد = العنوان");
  L.push("[ ] كل H2 تقريباً له <!-- source -->");
  L.push("[ ] أسئلة مراجعة موجودة وبـ (generated)");
  L.push("[ ] بطاقات مراجعة موجودة وبـ (generated)");
  L.push("[ ] تدقيق المصادر موجود");
  L.push("[ ] التعريفات بصيغة [!NOTE] **Term:**");
  L.push("[ ] لا معلومة من خارج المصدر المرفق");
  L.push("[ ] لا صفحات مخترعة");
  L.push("[ ] لا نص خارج content.md");
  L.push("```");
  L.push("");

  /* ── 10 Workflow ── */
  L.push(`## ١٠. سير العمل مع المستخدم`);
  L.push("");
  L.push(`1. المستخدم يلصق هذا الـprompt.`);
  L.push(`2. المستخدم يلصق **نص المصدر** (قد يكون طويلاً).`);
  L.push(`3. أنت تنتج \`content.md\` كاملاً.`);
  L.push(`4. إن كان النص ناقصاً جداً لبناء فصل: اطلب توضيحاً **مرة واحدة** ثم أكمل.`);
  L.push(`5. لا تطلب صفحات PDF — اعمل بالنص المعطى كاملاً.`);
  L.push("");

  /* ── 11 Output contract restated ── */
  L.push(`## ١١. عقد الخرج النهائي`);
  L.push("");
  L.push(`أخرج فقط:`);
  L.push("");
  L.push("```markdown");
  L.push("---");
  L.push(`# … frontmatter …`);
  L.push("---");
  L.push("");
  L.push(`# ${title}`);
  L.push("");
  L.push("<!-- source: … -->");
  L.push("## نظرة عامة");
  L.push("…");
  L.push("```");
  L.push("");
  L.push(`**لا** شرح · **لا** اعتذار · **لا** ملف ثانٍ · **لا** تعليق بعد آخر قسم.`);
  L.push("");

  L.push(`---`);
  L.push("");
  L.push(`## أمر ختامي`);
  L.push("");
  L.push(
    `أنت جاهز. بعد أن ألصق نص المصدر، أخرج **\`content.md\` كاملاً** الذي يحقق كل ما سبق — بلا أي كلام آخر.`
  );

  return L.join("\n").trim() + "\n";
}

/** Optional scaffold if someone still wants a starter file. */
export function buildContentScaffold(meta: PackageSourceMeta = {}): string {
  const subject = meta.subject?.trim() || "computer-networks";
  const document = meta.document?.trim() || "Source.pdf";
  const title = meta.title?.trim() || "فصل جديد";
  return [
    "---",
    `subject: ${subject}`,
    `title: "${title}"`,
    `language: ${meta.language ?? "ar"}`,
    "sources:",
    `  - document: "${document}"`,
    `    pages: [1]`,
    "---",
    "",
    `# ${title}`,
    "",
    `<!-- source: ${document} p.1 -->`,
    "## نظرة عامة",
    "",
    "…",
    "",
  ].join("\n");
}

export const NETWORKS_DEFAULT_PRESET_MATCH = [
  "قواعد عامة",
  "هيكل فصل",
  "شبكات",
  "تنسيق",
];
