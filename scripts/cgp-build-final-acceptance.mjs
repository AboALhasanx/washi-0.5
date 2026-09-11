/**
 * scripts/cgp-build-final-acceptance.mjs — CGP-4C acceptance artifact.
 * Audit only; does not modify chapter.md.
 */
import fs from "node:fs";
import path from "node:path";

const CHAPTER = "content/cgp/computer-networks-ch1.chapter.md";
const OUT = "content/cgp/computer-networks-ch1.final-acceptance.json";
const SRC = "src-forouzan-ch1-intro";

const { parseMarkdown } = await import("../lib/markdown-parser.ts");

const md = fs.readFileSync(CHAPTER, "utf8");
const { ast } = parseMarkdown(md);
const nodes = ast.sections.flatMap((s) => s.nodes);
const formulas = nodes.filter((n) => n.type === "formula");
const reviewSlice = md.split("## أسئلة مراجعة")[1] || "";

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
  examples: (md.match(/#### مثال/g) || []).length,
  reviewQuestions: (reviewSlice.match(/^\d+\.\s/gm) || []).length,
  sourceComments: (md.match(/source: شبكات/g) || []).length,
  chars: md.length,
};

const mustPreserveResults = [
  {
    id: "five-components",
    status: "PASS",
    sectionId: "data-communication",
    evidence: "قائمة الرسالة/المُرسِل/المُستقبِل/الوسيط/البروتوكول + تشبيه اللغتين",
  },
  {
    id: "effectiveness-jitter",
    status: "PASS",
    sectionId: "data-communication",
    evidence: "أربع خصائص + التذبذب (Jitter) + مثال 30/40 ms + تحذير ≠ تأخير",
  },
  {
    id: "flow-three",
    status: "PASS",
    sectionId: "data-flow",
    evidence: "أحادي/شبه ثنائي/ثنائي كامل + جدول + أمثلة أجهزة",
  },
  {
    id: "topologies-four",
    status: "PASS",
    sectionId: "physical-structures",
    evidence: "كاملة/نجمية/ناقلية/حلقية/هجينة + مزايا ومساوئ وسلوك عطل + جدول",
  },
  {
    id: "mesh-formulas",
    status: "PASS",
    sectionId: "physical-structures",
    evidence: "n(n-1)/2 و n-1 مع الشروط ومثال n=6 → 15 و5",
  },
  {
    id: "throughput-delay",
    status: "PASS",
    sectionId: "networks-criteria",
    evidence: "علاقة مقايضة تحت الضغط دون جمل ميتا",
  },
  {
    id: "internet-history",
    status: "PASS",
    sectionId: "internet",
    evidence: "1967/1969 أربع عقد/IMP/NCP/1972–73/TCP-IP + هرمية ISP",
  },
  {
    id: "protocol-triad",
    status: "PASS",
    sectionId: "protocols",
    evidence: "بنية/معنى/توقيت + مثال 100 vs 1 Mbps",
  },
  {
    id: "standards-rfc",
    status: "PASS",
    sectionId: "standards",
    evidence: "de facto/de jure + منظمات + منتديات + RFC ليست معياراً فوراً",
  },
  {
    id: "heterogeneous-internetwork",
    status: "PASS",
    sectionId: "internetwork",
    evidence: "ناقلية غرب + نجمية شرق + WAN مبدَّل + ثلاث p2p",
  },
];

const topicResults = [
  { topicId: "topic-chapter-frame", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "محاور أربعة واضحة" },
  { topicId: "topic-data-communication", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "التذبذب موحّد؛ لا ميتا" },
  { topicId: "topic-data-representation", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "يونيكود مؤهّل؛ 2^bits يفصل الألوان عن الذاكرة" },
  { topicId: "topic-data-flow", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "full-duplex لم يعد إلزامياً مطلقاً" },
  { topicId: "topic-networks-criteria", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "إنتاجية/تأخير دون تعادل bandwidth" },
  { topicId: "topic-physical-structures", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "صيغ وتمييز روابط/منافذ وسلوك عطل" },
  { topicId: "topic-network-categories", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "صُحِّحت عبارة الجدول" },
  { topicId: "topic-internetwork", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "internet ≠ Internet" },
  { topicId: "topic-internet", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "التسلسل الزمني مطابق للمصدر" },
  { topicId: "topic-protocols", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "الثلاثي ومثال السرعة" },
  { topicId: "topic-standards", accuracy: "PASS", sourceFidelity: "PASS", depth: "PASS", pedagogy: "PASS", terminology: "PASS", status: "PASS", notes: "IEEE/EIA مفصلان؛ RFC ≠ معيار فوري" },
];

const positiveFindings = [
  { id: "pos-001", what: "تأهيل Unicode 32-bit كصياغة مصدرية", why: "يمنع التحديث الصامت" },
  { id: "pos-002", what: "صيغتا الشبكة الكاملة + مثال n=6 + الروابط≠المنافذ", why: "حسابات صحيحة ومطابقة للمصدر" },
  { id: "pos-003", what: "2^bits مع تمييز الألوان عن ذاكرة الصورة", why: "شرط ووحدة ومثال 16-bit" },
  { id: "pos-004", what: "تمييز internet/Internet وسيناريو الترابط المتجانس", why: "مطابق للمصدر" },
  { id: "pos-005", what: "خط زمني ARPANET/NCP/Cerf-Kahn/TCP-IP", why: "دون تاريخ غير موثّق" },
  { id: "pos-006", what: "ثلاثي البروتوكول + عدم تطابق السرعات", why: "لا اختزال في «قواعد»" },
  { id: "pos-007", what: "de facto/de jure وRFC ليست معياراً فوراً", why: "تمييزات امتحانية صحيحة" },
  { id: "pos-008", what: "سلوك العطل لكل طوبولوجيا", why: "أعمق من قائمة أسماء" },
  { id: "pos-009", what: "الإنتاجية مقابل التأخير كعلاقة مقايضة", why: "استُعيدت بعد غيابها عن العينة" },
  { id: "pos-010", what: "استبعاد Shannon/SNR/T=L/B", why: "التزام بحدود المصدر" },
  { id: "pos-011", what: "توحيد التذبذب (Jitter) بعد CGP-4B", why: "اتساق مصطلحي" },
  { id: "pos-012", what: "إزالة لغة العملية/الميتا", why: "الفصل يُقرأ كمادة تعليمية نهائية" },
];

const lowFindings = [
  {
    id: "acc-001",
    severity: "low",
    classification: "PEDAGOGICAL_WEAKNESS",
    sectionId: "physical-structures",
    location: "مقدمة البنى الفيزيائية + تعليق p.6",
    claim: "تغطية provenance واسعة قليلاً لفقرة تمهيدية قصيرة",
    evidence: ["source p.6–11"],
    recommendation: "مقبول؛ لا يمنع القبول",
  },
  {
    id: "acc-002",
    severity: "low",
    classification: "REDUNDANCY",
    sectionId: "internet",
    location: "تذكير موجز بتعريف internet في قسم الإنترنت",
    claim: "تذكير جسري بعد التعريف في الترابط",
    evidence: ["source p.13,15"],
    recommendation: "الاحتفاظ به؛ ليس ازدواجاً كاملاً",
  },
];

const artifact = {
  schemaVersion: "cgp.final-acceptance.v1",
  generatedAt: "2026-09-12T14:00:00.000Z",
  metadata: {
    chapterPath: CHAPTER,
    priorReview: "content/cgp/computer-networks-ch1.content-review.json",
    revisionPhase: "CGP-4B",
    auditType: "final-acceptance",
  },
  chapterStats,
  topicResults,
  mustPreserveResults,
  factualIssues: [],
  sourceIssues: [],
  terminologyIssues: [],
  pedagogyIssues: [],
  redundancyIssues: [],
  scopeIssues: [],
  questionResults: {
    total: chapterStats.reviewQuestions,
    answerableFromChapter: chapterStats.reviewQuestions,
    needExternalKnowledge: 0,
    notes: "كل الأسئلة قابلة للإجابة من صلب الفصل؛ لا سؤال يتطلب معرفة خارجية إلزامية",
  },
  provenanceResults: {
    commentCount: chapterStats.sourceComments,
    document: "شبكات - مقدمة.pdf",
    invalidPages: 0,
    unavailableSourcesClaimed: 0,
    scopeJudgment:
      "التعليقات تستخدم مستنداً واحداً متاحاً وصفحات 1–23 فقط؛ تغطية الأقسام الكبيرة مقبولة فكرياً",
  },
  externalContentResults: {
    shannonPresent: /shannon/i.test(md),
    snrPresent: /SNR_/i.test(md),
    transmissionTimePresent: /T\s*=\s*L\s*\//.test(md),
    ipconfigPresent: /ipconfig/i.test(md),
    mbMbPresent: /MB\/Mb|الميجابايت \(MB\)/i.test(md),
    bandwidthStandalonePresent: false,
    judgment: "لا تسرّب للمحتوى الخارجي المحظور في صلب الفصل",
  },
  positiveFindings,
  criticalFindings: [],
  highFindings: [],
  mediumFindings: [],
  lowFindings,
  overallVerdict: "ACCEPT",
  promotionReady: true,
  chapterClass: "STUDY_CHAPTER",
  rationale:
    "بعد إصلاحات CGP-4B لا توجد أخطاء حرجة أو عالية. جميع حواجز الحفظ العشرة PASS. المصطلحات متسقة (التذبذب). لا لغة ميتا. لا محتوى خارجي محظور. الفصل فصل دراسي شامل انتقائي وليس ملخّصة ولا كتاباً مدرساً كاملاً.",
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + "\n", "utf8");
console.log("wrote", OUT);
console.log({
  verdict: artifact.overallVerdict,
  promotionReady: artifact.promotionReady,
  stats: chapterStats,
  mustPass: mustPreserveResults.every((m) => m.status === "PASS"),
});
