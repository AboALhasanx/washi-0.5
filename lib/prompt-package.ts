/**
 * lib/prompt-package.ts
 * ONE merged handoff prompt — not a stack of copied bodies.
 * The wizard output is a single coherent instruction document.
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

function detectExtras(prompts: PackagePromptPart[]): {
  questions: boolean;
  flashcards: boolean;
  provenanceOnly: boolean;
  repairOnly: boolean;
  qualityOnly: boolean;
  conceptsOnly: boolean;
  longContext: boolean;
  extraBodies: PackagePromptPart[];
} {
  let questions = false;
  let flashcards = false;
  let provenanceOnly = false;
  let repairOnly = false;
  let qualityOnly = false;
  let conceptsOnly = false;
  let longContext = false;
  const extraBodies: PackagePromptPart[] = [];

  // Titles baked into the master prompt — do not paste their bodies again.
  const baked = /قواعد عامة|هيكل فصل|تنسيق|شبكات الحاسوب|هندسة البرمجيات|قواعد مادة/;

  for (const p of prompts) {
    const t = p.title;
    if (/أسئلة مراجعة/.test(t)) questions = true;
    else if (/بطاقات/.test(t)) flashcards = true;
    else if (/مراجعة المصادر|provenance/.test(t)) provenanceOnly = true;
    else if (/إصلاح Markdown|repair/.test(t)) repairOnly = true;
    else if (/مراجعة جودة|rubric/.test(t)) qualityOnly = true;
    else if (/استخراج المفاهيم|concepts/.test(t)) conceptsOnly = true;
    else if (/طويل|chunked|long-context/i.test(t)) longContext = true;
    else if (!baked.test(t)) extraBodies.push(p);
  }
  return {
    questions,
    flashcards,
    provenanceOnly,
    repairOnly,
    qualityOnly,
    conceptsOnly,
    longContext,
    extraBodies,
  };
}

/**
 * Single merged prompt. One voice, one task, one output contract.
 * Selected extras become additional deliverables inside the same prompt.
 */
export function assemblePromptPackage(input: AssembleInput): string {
  const { meta, prompts, sourceText } = input;
  const subject = meta.subject?.trim() || "computer-networks";
  const pages = meta.pages.trim() || "1";
  const document = meta.document.trim() || "Source.pdf";
  const title = meta.title.trim() || "فصل جديد";
  const isNetworks = subject === "computer-networks";
  const x = detectExtras(prompts);

  const L: string[] = [];

  // ── One task, one role ──
  L.push(`# المهمة: إنتاج فصل تعليمي كامل لمنصة واشي (Washi)`);
  L.push("");
  L.push(
    `أنت معدّ محتوى أكاديمي عربي. مهمتك **واحدة**: حوّل **المصدر** في نهاية هذا الطلب إلى **ملف Markdown واحد** جاهز للنشر في واشي، يحقق عقد المحرّك بالكامل.`
  );
  L.push("");
  L.push(`| الحقل | القيمة |`);
  L.push(`|-------|--------|`);
  L.push(`| المادة | \`${subject}\`${isNetworks ? " — شبكات الحاسوب" : ""} |`);
  L.push(`| العنوان | ${title} |`);
  L.push(`| المستند | ${document} |`);
  L.push(`| الصفحات | ${pages} |`);
  L.push(`| اللغة | ${meta.language ?? "ar"} |`);
  L.push("");

  // ── Identity & non-negotiable contract (merged, not copied) ──
  L.push(`## ١ — الهوية والعقد (غير قابل للتفاوض)`);
  L.push("");
  L.push(`لا تخرج شيئاً سوى ملف الـMarkdown النهائي. بلا مقدمات، بلا اعتذارات، بلا \`\`\`markdown wrapper إن أمكن.`);
  L.push("");
  L.push(`**الـfrontmatter** أول الملف بالضبط:`);
  L.push("");
  L.push("```yaml");
  L.push("---");
  L.push(`subject: ${subject}`);
  L.push(`title: "${title}"`);
  L.push(`language: ${meta.language ?? "ar"}`);
  L.push("sources:");
  L.push(`  - document: "${document}"`);
  L.push(`    pages: [${pages}]`);
  L.push("---");
  L.push("```");
  L.push("");
  L.push(`- **H1 واحد** مطابق للعنوان، ثم أقسام **H2** فقط (لا H3 إلا لضرورة داخلية قصيرة).`);
  L.push(`- **كل قسم منقول** يبدأ بتعليق مصدر:`);
  L.push(`  \`<!-- source: ${document} p.N -->\``);
  L.push(`- **محتوى مولّد** (أسئلة، بطاقات، خلاصة تفسيرية) يُعلَّم:`);
  L.push(`  \`<!-- source: (generated) -->\``);
  L.push(`- **ممنوع** اختراع رقم صفحة غير وارد في \`pages\` أعلاه.`);
  L.push(`- **ممنوع** معلومة واقعية/رقمية/تاريخية بلا مصدر معلّم.`);
  L.push(`- المصطلح الإنجليزي مع العربي عند أول ذكر: \`(Shannon Capacity)\`.`);
  L.push("");

  // ── Structure ──
  L.push(`## ٢ — هيكل الفصل الإلزامي`);
  L.push("");
  L.push(`اتبع هذا التسلسل (عدّل صياغة العناوين إن لزم، لا الترتيب المنطقي):`);
  L.push("");
  L.push(`1. \`## نظرة عامة\` — لماذا الفصل مهم + أهداف (مفاهيمي / تحليلي / تطبيقي).`);
  L.push(`2. \`## المفاهيم الأساسية\` — 3–6 تعريفات بصيغة واشي (أدناه).`);
  L.push(`3. \`## الشرح التفصيلي\` — أقسام H2 حسب تسلسل المصدر؛ شرح + مثال واقعي + مصدر.`);
  if (isNetworks) {
    L.push(`   - غطِّ: مكوّنات الشبكة، أنماطها (LAN/MAN/WAN)، مقاييس الأداء (bandwidth, latency, throughput)، ونماذج الطبقات إن وردت.`);
  }
  L.push(`4. \`## أمثلة محلولة\` — إن وجدت في المصدر.`);
  L.push(`5. \`## التعاريف\` — تجميع مصطلحات التنافسي إن تكررت.`);
  L.push(`6. \`## خلاصة سريعة\` — نقاط bullet مكثّفة.`);
  if (x.questions) {
    L.push(`7. \`## أسئلة مراجعة\` — **مطلوب** 6–10 أسئلة (تذكير + فهم + تطبيق) بصيغة:`);
    L.push(`   \`1. **السؤال؟**\` ثم خيارات أ/ب/ج/د + الإجابة والسبب المختصر.`);
  } else {
    L.push(`7. \`## أسئلة مراجعة\` — 5–8 أسئلة قصيرة (بدون خيارات إلزامية).`);
  }
  if (x.flashcards) {
    L.push(`8. \`## بطاقات المراجعة\` — **مطلوب** جدول | Q | A | من 8 إلى 20 بطاقة من نص الفصل فقط.`);
  }
  L.push("");

  // ── Components ──
  L.push(`## ٣ — صيغة المكوّنات (يقرأها محرّك واشي حرفياً)`);
  L.push("");
  L.push(`**التعريف (يتحول لبطاقة):**`);
  L.push("```markdown");
  L.push("> [!NOTE] **Bandwidth (عرض النطاق):** التعريف الدقيق من المصدر…");
  L.push("```");
  L.push("");
  L.push(`**التنبيهات المسموحة:** \`[!NOTE]\` \`[!IMPORTANT]\` \`[!WARNING]\` \`[!EXAMPLE]\` \`[!TIP]\``);
  L.push("");
  L.push(`**المعادلات:** عرض داخل \`$$ … $$\`، سطر داخل \`$ … $\`. توازن الأقواس إلزامي.`);
  if (isNetworks) {
    L.push(`مثال مطلوب إن ورد: Shannon — \`C = B \\log_2(1 + S/N)\``);
  }
  L.push("");
  L.push(`**الجداول:** صف رأس + صفوف. القيم \`40%\` تتحول لرسوم أعمدة في PDF.`);
  L.push("");
  L.push(`**الأكواد:** fenced \`\`\` مع اللغة. لا تخلط اتجاه الكود مع النص العربي.`);
  L.push("");

  if (isNetworks) {
    L.push(`## ٤ — خصوصية مادة الشبكات`);
    L.push("");
    L.push(`- لا تخلط **الشبكة** (Network) مع **الإنترنت** (Internet) — وضّح الفرق.`);
    L.push(`- أمثلة واقعية: LAN في مبنى، WAN بين مدن، TCP/IP، عرض النطاق وزمن التأخير.`);
    L.push(`- المصطلحات الشائعة: (Sender, Receiver, Protocol, Server, Client, Throughput).`);
    L.push(`- مستوى: سنة أولى/ثانية جامعية ما لم ينصّ المصدر على غير ذلك.`);
    L.push("");
  }

  // ── Optional extra deliverables in the SAME prompt ──
  const extras: string[] = [];
  if (x.provenanceOnly) {
    extras.push(
      `أضف في نهاية الملف قسم \`## تدقيق المصادر\` يذكر: عدد الأقسام بتعليق source، وأي معلومة تبدو غير مدعومة (حتى لو أبقيتها مع تنبيه).`
    );
  }
  if (x.conceptsOnly) {
    extras.push(
      `بعد الـMarkdown، أضف كتلة HTML comment أو قسماً \`## JSON Concepts\` بصيغة:\n\`\`\`json\n{"concepts":[{"term":"","termAr":"","definition":"","pages":[]}]}\n\`\`\``
    );
  }
  if (x.qualityOnly) {
    extras.push(
      `في نهاية الملف أضف \`## بطاقة جودة ذاتيّة\` جدولاً: دقة / وضوح / أمثلة / تغطية — من 5، دون إعادة كتابة الفصل.`
    );
  }
  if (x.longContext) {
    extras.push(
      `المصدر قد يكون طويلاً: ابنِ الهيكل أولاً كاملاً، ثم وسّع كل قسم بالتفاصيل — لا تلخيص سطحي فقط.`
    );
  }
  if (x.repairOnly) {
    extras.push(
      `إذا وجدت بنية Markdown مكسورة في المصدر فصلحها ضمن العقد أعلاه دون تغيير المعنى العلمي.`
    );
  }
  for (const e of x.extraBodies) {
    extras.push(`**${e.title}:**\n${e.body.trim()}`);
  }

  if (extras.length) {
    L.push(`## ${isNetworks ? "٥" : "٤"} — متطلبات إضافية (جزء من نفس المهمة)`);
    L.push("");
    for (const e of extras) {
      L.push(e);
      L.push("");
    }
  }

  // ── Source payload ──
  L.push(`---`);
  L.push("");
  L.push(`## المصدر (استعمله فقط — لا معرفة خارجية إن أمكن)`);
  L.push("");
  L.push("```text");
  L.push(sourceText.trim() || "(لا يوجد نص — أكمل من الـfrontmatter إن أمكن وإلا اطلب المصدر)");
  L.push("```");
  L.push("");

  // ── Final instruction ──
  L.push(`---`);
  L.push("");
  L.push(`## أمر الختام`);
  L.push("");
  L.push(
    `أخرج **ملف \`content.md\` واحداً كاملاً** يحقق كل ما سبق. راجع نفسك مرة: frontmatter؟ مصدر لكل قسم؟ لا صفحة مخترعة؟ تعريفات بصيغة \`[!NOTE]\`؟ ثم سلّم الملف فقط.`
  );

  return L.join("\n").trim() + "\n";
}

/** Starter content.md scaffold with frontmatter filled (empty body sections). */
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
    "<!-- source: (generated) -->",
    "## أسئلة مراجعة",
    "",
    "1. **سؤال؟**",
    "",
  ].join("\n");
}

/** Default preset titles to pre-check for a Networks chapter run. */
export const NETWORKS_DEFAULT_PRESET_MATCH = [
  "قواعد عامة",
  "هيكل فصل",
  "شبكات",
  "تنسيق",
];
