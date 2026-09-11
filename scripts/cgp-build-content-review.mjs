/**
 * scripts/cgp-build-content-review.mjs — CGP-4A audit artifact builder.
 * Deterministic stats + authored findings. Does not modify chapter.md.
 */
import fs from "node:fs";
import path from "node:path";

const CHAPTER = "content/cgp/computer-networks-ch1.chapter.md";
const OUT = "content/cgp/computer-networks-ch1.content-review.json";

const { parseMarkdown } = await import("../lib/markdown-parser.ts");

const md = fs.readFileSync(CHAPTER, "utf8");
const { ast } = parseMarkdown(md);
const nodes = ast.sections.flatMap((s) => s.nodes);
const formulas = nodes.filter((n) => n.type === "formula");

const chapterStats = {
  sections: ast.sections.length,
  headings: nodes.filter((n) => n.type === "heading").length,
  paragraphs: nodes.filter((n) => n.type === "paragraph").length,
  lists: nodes.filter((n) => n.type === "list").length,
  listItems: nodes
    .filter((n) => n.type === "list")
    .reduce((a, l) => a + (l.items?.length || 0), 0),
  tables: nodes.filter((n) => n.type === "table").length,
  callouts: nodes.filter((n) => n.type === "callout" || n.type === "definition").length,
  formulas: {
    display: formulas.filter((f) => f.displayMode === true).length,
    inline: formulas.filter((f) => f.displayMode === false).length,
    total: formulas.length,
  },
  examples: (md.match(/#### مثال/g) || []).length + (md.match(/\*\*مثال/g) || []).length,
  reviewQuestions: (md.match(/^\d+\.\s/gm) || []).filter((_, i, a) => true).length,
  sourceComments: (md.match(/<!--\s*source:/g) || []).length,
  chars: md.length,
};
// recount review questions only in last section
const reviewSlice = md.slice(md.indexOf("## أسئلة مراجعة"));
chapterStats.reviewQuestions = (reviewSlice.match(/^\d+\.\s/gm) || []).length;

const SRC = "src-forouzan-ch1-intro";
const ev = (pages, note) => [{ sourceId: SRC, pages, note }];

const factIssues = [
  {
    id: "review-001",
    severity: "high",
    classification: "OVERSTATEMENT",
    sectionId: "data-flow",
    location: "Full-duplex — السعة",
    claim:
      "«يجب قسمة سعة الرابط بين الاتجاهين» تُقدَّم كإلزام مطلق",
    evidence: ev(
      [5],
      "Source: sharing can occur via two physically separate paths OR by dividing channel capacity",
    ),
    impact:
      "الطالب قد يعتقد أن وجود مسارَين فيزيائيين منفصلين لا يزال «قسماً» لسعة واحدة مشتركة",
    recommendation:
      "يُشار إلى أن المصدر يذكر بديلين: مساران فيزيائيان منفصلان، أو قسمة سعة القناة",
  },
  {
    id: "review-002",
    severity: "medium",
    classification: "OVERSTATEMENT",
    sectionId: "data-communication",
    location: "«لا يكتمل الحكم على الاتصال بغياب أي منها»",
    claim: "صياغة أقوى من «تعتمد الفعالية على أربع خصائص»",
    evidence: ev([2], "Source: effectiveness depends on four fundamental characteristics"),
    impact: "قد تُقرأ كقانون إلزامي لكل رسالة مهما كان سياقها",
    recommendation: "إبقاء الصياغة أقرب إلى «تعتمد الفعالية على…» دون اختزال مطلق",
  },
  {
    id: "review-003",
    severity: "low",
    classification: "OVERSIMPLIFICATION",
    sectionId: "data-representation",
    location: "«حجم البكسل يعتمد على الدقة»",
    claim: "يتبع صياغة المصدر التعليمية عن pixel size / resolution",
    evidence: ev([3], "Source: The size of the pixel depends on the resolution; 1000 vs 10000 pixels"),
    impact: "قد يختلط «حجم البكسل» بعدد البكسلات في الفهم الحديث",
    recommendation: "الاحتفاظ بصياغة المصدر مع توجيه الانتباه إلى أن المقصود عدد/كثافة البكسلات",
  },
];

const terminologyIssues = [
  {
    id: "review-004",
    severity: "high",
    classification: "TERMINOLOGY_PROBLEM",
    sectionId: "data-communication",
    location: "Jitter — التموج vs التملج",
    claim: "استخدام «التموج» في قائمة الخصائص و«التملنج» في التحذير والمثال",
    evidence: ev([2], "Jitter defined as variation in packet arrival time"),
    impact: "عدم اتساق المصطلح العربي يربك الحفظ والبحث",
    recommendation: "توحيد الترجمة العربية (التموج أو التملج) في كل الفصل",
  },
  {
    id: "review-005",
    severity: "medium",
    classification: "TERMINOLOGY_PROBLEM",
    sectionId: "network-categories",
    location: "جدول الفئات — منزل بهب",
    claim: "«مكتب، منزل بهب» — صياغة مكسورة/غير واضحة",
    evidence: ev([12], "Source home office example: two PCs and a printer"),
    impact: "خلل لغوي في مثال تصنيف مهم",
    recommendation: "تصحيح العبارة إلى مثال منزلي واضح (مثل: مكتب منزلي بعدة أجهزة)",
  },
  {
    id: "review-006",
    severity: "low",
    classification: "TERMINOLOGY_PROBLEM",
    sectionId: "data-flow",
    location: "Simplex examples",
    claim: "«الشاشات التقنية» بدل «الشاشات التقليدية» (traditional monitors)",
    evidence: ev([4], "Keyboards and traditional monitors"),
    impact: "ترجمة غير دقيقة للصفة traditional",
    recommendation: "استخدام «الشاشات التقليدية»",
  },
  {
    id: "review-007",
    severity: "low",
    classification: "TERMINOLOGY_PROBLEM",
    sectionId: "physical-structures",
    location: "Tap / «ضفّة»",
    claim: "ترجمة Tap بـ «ضفّة» غير شائعة تقنياً",
    evidence: ev([9], "tap is a connector that splices or punctures the cable"),
    impact: "غموض في تشريح الناقلية",
    recommendation: "«موصل تفريع (Tap)» أو الاحتفاظ بالإنجليزية مع شرح وظيفي",
  },
];

const scopeIssues = [
  {
    id: "review-008",
    severity: "medium",
    classification: "SCOPE_PROBLEM",
    sectionId: "data-representation",
    location: "«هذا القسم كان غائباً تقريباً من الملخّصات المختصرة»",
    claim: "تعليق ميتا عن عملية التوليد داخل نص الطالب",
    evidence: [],
    impact: "يكسر صوت الفصل التعليمي ويعرّض الطالب لسياق داخلي غير مفيد",
    recommendation: "حذف الجملة الميتا",
  },
  {
    id: "review-009",
    severity: "medium",
    classification: "SCOPE_PROBLEM",
    sectionId: "networks-criteria",
    location: "«المصدر هنا يعلّم الأداء عبر…»",
    claim: "تعليق ميتا عن خيارات التصميم داخل فقرة الأداء",
    evidence: ev([6], "throughput vs delay tradeoff"),
    impact: "خلل في نبرة الفصل",
    recommendation: "تحويل الجملة إلى ملاحظة تعليمية بدون ذكر «المصدر هنا»",
  },
];

const pedagogyIssues = [
  {
    id: "review-010",
    severity: "low",
    classification: "PEDAGOGICAL_WEAKNESS",
    sectionId: "standards",
    location: "IEEE و EIA في نقطة واحدة",
    claim: "دمج دورين مختلفين في جملة قصيرة",
    evidence: ev([18, 19], "Source describes organizations separately"),
    impact: "ضعف تمييز الأدوار",
    recommendation: "تفصيل موجز لكل منظمة كما في المصدر",
  },
  {
    id: "review-011",
    severity: "low",
    classification: "PEDAGOGICAL_WEAKNESS",
    sectionId: "data-communication",
    location: "جدول الخصائص الأربع — عمود حساسية الوسائط",
    claim: "«جميع الأنواع» للتسليم/الدقة استنتاج تعليمي لا صياغة مصدر حرفية",
    evidence: ev([2]),
    impact: "مقبول تعليمياً لكنه ليس اقتباساً مباشراً",
    recommendation: "تبيين أنه تلخيص تعليمي أو تبسيطه",
  },
];

const good = [
  {
    id: "pos-001",
    sectionId: "data-representation",
    what: "تأهيل ادعاء يونيكود 32-bit كصياغة مصدرية",
    why: "يمنع التحديث الصامت ويوثّق حدود المصدر",
  },
  {
    id: "pos-002",
    sectionId: "physical-structures",
    what: "صيغتا الشبكة الكاملة مع الشروط ومثال n=6 وتمييز الروابط عن المنافذ",
    why: "حسابات صحيحة ومطابقة للمصدر؛ حماية ضد الخطأ الشائع",
  },
  {
    id: "pos-003",
    sectionId: "data-representation",
    what: "صيغة 2^bits مع تمييز الألوان عن ذاكرة الصورة",
    why: "شرط ووحدة ومثال 16-bit صحيحان",
  },
  {
    id: "pos-004",
    sectionId: "internetwork",
    what: "تمييز internet / Internet وسيناريو الشبكتين + WAN",
    why: "مطابق للمصدر؛ يمنع الدمج الخاطئ",
  },
  {
    id: "pos-005",
    sectionId: "internet",
    what: "الخط الزمني ARPANET/NCP/Cerf-Kahn/TCP-IP والأدوار",
    why: "يتبع تسلسل المصدر دون إضافة تاريخ غير موثّق",
  },
  {
    id: "pos-006",
    sectionId: "protocols",
    what: "ثلاثي البنية/المعنى/التوقيت مع مثال 100 vs 1 Mbps",
    why: "لا يختزل البروتوكول في «قواعد»",
  },
  {
    id: "pos-007",
    sectionId: "standards",
    what: "de facto/de jure + RFC ليست معياراً فوراً",
    why: "تمييزات امتحانية صحيحة",
  },
  {
    id: "pos-008",
    sectionId: "physical-structures",
    what: "سلوك العطل لكل طوبولوجيا (موزّع/ناقلية/حلقة)",
    why: "أعمق من قائمة أسماء",
  },
  {
    id: "pos-009",
    sectionId: "networks-criteria",
    what: "الإنتاجية مقابل التأخير كعلاقة مقايضة",
    why: "استعادة معرفة كانت غائبة عن العينة القديمة",
  },
  {
    id: "pos-010",
    sectionId: "chapter",
    what: "استبعاد Shannon/SNR/T=L/B من صلب الفصل",
    why: "التزام بقرار CGP-2 وعدم تهريب معرفة غير مدعومة",
  },
];

const mustPreserveReviews = [
  {
    id: "guard-five-components",
    status: "PASS",
    present: true,
    accurate: true,
    adequatelyExplained: true,
    sourceBacked: true,
    evidence: "قائمة الخمسة + تشبيه الفرنسية/اليابانية + تحذير الاختزال",
  },
  {
    id: "guard-effectiveness-four",
    status: "PASS",
    present: true,
    accurate: true,
    adequatelyExplained: true,
    sourceBacked: true,
    evidence: "أربع خصائص + مثال 30/40 ms + تحذير التملج≠التأخير",
  },
  {
    id: "guard-flow-three",
    status: "PASS",
    present: true,
    accurate: true,
    adequatelyExplained: true,
    sourceBacked: true,
    evidence: "ثلاثة أقسام + جدول مقارنة + أمثلة أجهزة",
  },
  {
    id: "guard-topology-four",
    status: "PASS",
    present: true,
    accurate: true,
    adequatelyExplained: true,
    sourceBacked: true,
    evidence: "كاملة/نجمية/ناقلية/حلقية + هجينة + مزايا/مساوئ/عطل + جدول",
  },
  {
    id: "guard-mesh-formulas",
    status: "PASS",
    present: true,
    accurate: true,
    adequatelyExplained: true,
    sourceBacked: true,
    evidence: "n(n-1)/2 و n-1 مع شروط ومثال ستة أجهزة 15 و5",
  },
  {
    id: "guard-throughput-delay",
    status: "PASS",
    present: true,
    accurate: true,
    adequatelyExplained: true,
    sourceBacked: true,
    evidence: "فقرة مقايضة تحت الضغط",
  },
  {
    id: "guard-internet-history",
    status: "PASS",
    present: true,
    accurate: true,
    adequatelyExplained: true,
    sourceBacked: true,
    evidence: "1967/1969 أربع عقد/NCP/1972–73/TCP-IP + هرمية ISP",
  },
  {
    id: "guard-protocol-elements",
    status: "PASS",
    present: true,
    accurate: true,
    adequatelyExplained: true,
    sourceBacked: true,
    evidence: "syntax/semantics/timing + rate mismatch",
  },
  {
    id: "guard-de-facto-de-jure",
    status: "PASS",
    present: true,
    accurate: true,
    adequatelyExplained: true,
    sourceBacked: true,
    evidence: "فئتان + منظمات + منتديات + RFC process",
  },
  {
    id: "guard-heterogeneous-internetwork",
    status: "PASS",
    present: true,
    accurate: true,
    adequatelyExplained: true,
    sourceBacked: true,
    evidence: "سيناريو ناقلية غرب + نجمية شرق + WAN مبدَّل + 3 p2p",
  },
];

const topicReviews = [
  {
    topicId: "topic-chapter-frame",
    coverage: "PASS",
    accuracy: "PASS",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PASS",
    notes: "محاور أربعة + جسر تعليمي واضح",
  },
  {
    topicId: "topic-data-communication",
    coverage: "PASS",
    accuracy: "PASS",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PASS",
    notes: "مكتمل؛ ملاحظة ميتا صغيرة على مستوى التصنيف في جدول الفعالية",
  },
  {
    topicId: "topic-data-representation",
    coverage: "PASS",
    accuracy: "PASS",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PASS",
    notes: "استُعيد بعمق؛ Unicode مؤهَّل؛ صيغة الألوان صحيحة",
  },
  {
    topicId: "topic-data-flow",
    coverage: "PASS",
    accuracy: "PARTIAL",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PASS",
    notes: "overstatement على «يجب قسمة السعة» في full-duplex",
  },
  {
    topicId: "topic-networks-criteria",
    coverage: "PASS",
    accuracy: "PASS",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PARTIAL",
    notes: "علاقة الإنتاجية/التأخير ممتازة؛ جملة ميتا عن «المصدر هنا»",
  },
  {
    topicId: "topic-physical-structures",
    coverage: "PASS",
    accuracy: "PASS",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PASS",
    notes: "أقوى أقسام الفصل؛ الصيغ والتمييزات صحيحة",
  },
  {
    topicId: "topic-network-categories",
    coverage: "PASS",
    accuracy: "PASS",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PARTIAL",
    notes: "خطأ لغوي «منزل بهب» في جدول المقارنة",
  },
  {
    topicId: "topic-internetwork",
    coverage: "PASS",
    accuracy: "PASS",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PASS",
    notes: "سيناريو متجانس مطابق؛ تمييز internet/Internet",
  },
  {
    topicId: "topic-internet",
    coverage: "PASS",
    accuracy: "PASS",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PASS",
    notes: "التسلسل الزمني والأدوار والهرمية مطابقة للمصدر",
  },
  {
    topicId: "topic-protocols",
    coverage: "PASS",
    accuracy: "PASS",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PASS",
    notes: "الثلاثي ومثال السرعة",
  },
  {
    topicId: "topic-standards",
    coverage: "PASS",
    accuracy: "PASS",
    depth: "PASS",
    sourceFidelity: "PASS",
    pedagogy: "PARTIAL",
    notes: "IEEE/EIA مضغوطان قليلاً",
  },
];

const sourceIssues = [
  {
    id: "review-012",
    severity: "low",
    classification: "PEDAGOGICAL_WEAKNESS",
    sectionId: "physical-structures",
    location: "مصدر p.6 على مقدمة البنى الفيزيائية",
    claim: "تعليق المصدر يغطي مقدمة قصيرة قبل تفاصيل p.7–11",
    evidence: ev([6, 7]),
    impact: "تغطية provenance واسعة قليلاً لكنها مقبولة",
    recommendation: "لا يتطلب إصلاحاً عاجلاً",
  },
];

const redundancyIssues = [
  {
    id: "review-013",
    severity: "low",
    classification: "REDUNDANCY",
    sectionId: "internetwork",
    location: "إعادة تعريف الشبكة/الإنترنت الصغير في قسم الإنترنت",
    claim: "إعادة تعريف موجزة بعد تقديمه في الترابط",
    evidence: ev([13, 15]),
    impact: "خفيف؛ يعمل كتذكير جسري لا كازدواج كامل",
    recommendation: "الاحتفاظ بالتذكير أو اختصاره قليلاً",
  },
];

const questionIssues = [
  {
    id: "review-014",
    severity: "low",
    classification: "GOOD",
    sectionId: "integrated-review",
    location: "سؤال 20 — حساسية التطبيقات للتأخير",
    claim: "يستند إلى تمرين المصدر 23 ويعتمد على شرح الإنتاجية/التأخير",
    evidence: ev([23]),
    impact: "مناسب وقابل للإجابة من الفصل",
    recommendation: "لا تغيير",
  },
];

const allIssues = [
  ...factIssues,
  ...terminologyIssues,
  ...scopeIssues,
  ...pedagogyIssues,
  ...sourceIssues,
  ...redundancyIssues,
  ...questionIssues,
];
const crit = allIssues.filter((i) => i.severity === "critical").length;
const high = allIssues.filter((i) => i.severity === "high").length;
const med = allIssues.filter((i) => i.severity === "medium").length;
const low = allIssues.filter((i) => i.severity === "low").length;

const artifact = {
  schemaVersion: "cgp.chapter-review.v1",
  generatedAt: "2026-09-12T10:00:00.000Z",
  metadata: {
    chapterPath: CHAPTER,
    planPath: "content/cgp/computer-networks-ch1.chapter-plan.json",
    sourcePath: "content/cgp/sources/forouzan-ch1.pages.json",
    reviewType: "audit-only",
  },
  chapterStats,
  topicReviews,
  mustPreserveReviews,
  factIssues,
  sourceIssues,
  terminologyIssues,
  pedagogyIssues,
  redundancyIssues,
  scopeIssues,
  formulaIssues: [],
  exampleIssues: [],
  questionIssues,
  languageIssues: [],
  positivePreservationList: good,
  overallReadiness: {
    level: "READY_WITH_REVISIONS",
    criticalCount: crit,
    highCount: high,
    mediumCount: med,
    lowCount: low,
    compressionRegression: false,
    rationale:
      "لا أخطاء حرجة؛ استُعيدت المعرفة المفقودة بدقة مصدرية جيدة. تتطلب مراجعة: توحيد مصطلح التملج/التموج، تخفيف إلزام قسمة السعة في full-duplex، وحذف جملتين ميتا، وتصحيح «منزل بهب».",
  },
};

fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + "\n", "utf8");
console.log("wrote", OUT);
console.log({ chapterStats, crit, high, med, low, readiness: artifact.overallReadiness.level });
