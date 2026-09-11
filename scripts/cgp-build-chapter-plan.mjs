/**
 * scripts/cgp-build-chapter-plan.mjs
 * CGP-3: derive chapter-plan.v1 from composition + deep-topics + validation.
 */
import fs from "node:fs";
import path from "node:path";

const composition = JSON.parse(
  fs.readFileSync("content/cgp/computer-networks-ch1.composition.json", "utf8"),
);
const deep = JSON.parse(
  fs.readFileSync("content/cgp/computer-networks-ch1.deep-topics.json", "utf8"),
);
const map = JSON.parse(
  fs.readFileSync("content/cgp/computer-networks-ch1.topic-map.json", "utf8"),
);
const validation = JSON.parse(
  fs.readFileSync("content/cgp/computer-networks-ch1.validation.json", "utf8"),
);

const OUT = "content/cgp/computer-networks-ch1.chapter-plan.json";
const SRC = "src-forouzan-ch1-intro";

const conceptById = new Map();
for (const t of deep.topics) {
  for (const c of t.concepts) conceptById.set(c.id, { ...c, topicId: t.topicId });
}
const topicById = new Map(deep.topics.map((t) => [t.topicId, t]));

/** Depth per section id — semantic weight, not word count. */
const DEPTH = {
  "section-chapter-frame": "FOUNDATIONAL",
  "section-data-communication": "EXPLANATORY",
  "section-data-representation": "DETAILED",
  "section-data-flow": "EXPLANATORY",
  "section-networks-criteria": "DEPLANATORY",
  "section-physical-structures": "DETAILED",
  "section-network-categories": "DETAILED",
  "section-internetwork": "EXPLANATORY",
  "section-internet": "EXPLANATORY",
  "section-protocols": "DETAILED",
  "section-standards": "DETAILED",
  "section-integrated-review": "EXAM-CRITICAL",
};
// fix typo
DEPTH["section-networks-criteria"] = "EXPLANATORY";

const WHY = {
  "section-chapter-frame":
    "Orient learners on the source's four pillars before dense definitions.",
  "section-data-communication":
    "Define data communications and lock the four effectiveness criteria + five-component taxonomy that the old sample lost.",
  "section-data-representation":
    "Restore the largest sample omission: how text/numbers/images/audio/video become bits, including Unicode/ASCII and pixel depth.",
  "section-data-flow":
    "Teach direction of transmission with capacity semantics — a small but exam-dense unit.",
  "section-networks-criteria":
    "Define networks and restore performance/reliability/security plus the throughput–delay relationship.",
  "section-physical-structures":
    "Largest source block: connection types, four topologies, hybrid, mesh formulas, and failure modes.",
  "section-network-categories":
    "Classify by geographic scope and distinguish switched vs point-to-point WAN without invented speed tables.",
  "section-internetwork":
    "Keep lowercase internetwork distinct from the Internet using the heterogeneous two-LAN scenario.",
  "section-internet":
    "Explain how the Internet emerged (ARPANET → TCP/IP) and how it is organized (ISP hierarchy).",
  "section-protocols":
    "Upgrade protocol from 'a set of rules' to syntax/semantics/timing with a rate-mismatch example.",
  "section-standards":
    "Restore de facto/de jure, organizations, forums, and the draft→RFC process.",
  "section-integrated-review":
    "Map exam skills from validated knowledge; questions are generated later, not authored now.",
};

const OBJECTIVES = {
  "section-chapter-frame": [
    "Name the four issues the chapter addresses",
  ],
  "section-data-communication": [
    "Define data communications and its system requirements",
    "List delivery, accuracy, timeliness, and jitter",
    "Name the five components and explain why protocol is required",
  ],
  "section-data-representation": [
    "Explain how text, numbers, and images are represented as bits",
    "Relate Unicode and ASCII as stated in the source",
    "Apply the 2^bits color-depth relationship",
  ],
  "section-data-flow": [
    "Classify a link as simplex, half-duplex, or full-duplex",
    "Explain capacity use in each mode",
  ],
  "section-networks-criteria": [
    "Define network and node",
    "State performance, reliability, and security as the three criteria",
    "Explain the throughput–delay tradeoff under load",
  ],
  "section-physical-structures": [
    "Distinguish point-to-point and multipoint connections",
    "Compare mesh, star, bus, and ring topologies including failure modes",
    "Compute mesh links and ports for n devices",
  ],
  "section-network-categories": [
    "Classify networks as LAN, MAN, or WAN by scope",
    "Distinguish switched WAN from point-to-point WAN",
  ],
  "section-internetwork": [
    "Define internetwork (lowercase internet)",
    "Explain the heterogeneous two-LAN + WAN scenario",
  ],
  "section-internet": [
    "Summarize the ARPANET → TCP/IP path",
    "Describe the four-level ISP hierarchy",
  ],
  "section-protocols": [
    "Explain syntax, semantics, and timing as protocol elements",
    "Use the rate-mismatch example to show why timing matters",
  ],
  "section-standards": [
    "Distinguish de facto and de jure standards",
    "Name major standards organizations",
    "Describe the draft → RFC → Internet standard process",
  ],
  "section-integrated-review": [
    "Check definitions, distinctions, calculations, and scenarios from the chapter",
  ],
};

const SEQUENCE_KIND = {
  taxonomy: "introduce",
  definition: "introduce",
  explanation: "explain",
  relationship: "relate",
  example: "example",
  comparison: "compare",
  formula: "formula",
  "exam-note": "exam-note",
  bridge: "bridge",
  mechanism: "explain",
};

function sourceWeightFor(section) {
  const pages = new Set();
  for (const r of section.sourceRefs || []) {
    for (const p of r.pages || []) pages.add(p);
  }
  let conceptCount = 0;
  let relationshipCount = 0;
  let exerciseSignalCount = 0;
  for (const tid of section.topicIds) {
    const t = topicById.get(tid);
    if (!t) continue;
    conceptCount += t.concepts.length;
    relationshipCount += t.relationships.length;
    exerciseSignalCount += t.exerciseSignals.length;
  }
  const n = conceptCount + relationshipCount;
  const signal = n >= 12 ? "heavy" : n >= 6 ? "moderate" : "light";
  return {
    pages: [...pages].sort((a, b) => a - b),
    conceptCount,
    relationshipCount,
    exerciseSignalCount,
    signal,
  };
}

const sections = composition.sections.map((s, idx) => {
  const topicId = s.topicIds[0];
  const t = topicById.get(topicId);
  const confusions = (t?.confusions || []).map((c) => c.id);
  // also collect confusions from concepts' commonConfusionIds
  for (const u of s.requiredConcepts) {
    const c = conceptById.get(u.conceptId);
    for (const id of c?.commonConfusionIds || []) {
      if (!confusions.includes(id)) confusions.push(id);
    }
  }

  return {
    id: s.id,
    order: idx + 1,
    title: s.title,
    arabicTitleHint: s.arabicTitleHint,
    purpose: s.purpose,
    whyItExists: WHY[s.id] || s.purpose,
    depth: DEPTH[s.id] || "EXPLANATORY",
    sourceWeight: sourceWeightFor(s),
    sourceRefs: s.sourceRefs,
    topicIds: s.topicIds,
    conceptIds: s.requiredConcepts.map((u) => u.conceptId),
    relationshipIds: s.requiredRelationshipIds || [],
    definitionIds: (s.definitions || []).map((d) => d.definitionId),
    exampleIds: (s.examples || []).map((e) => e.exampleId),
    comparisonIds: (s.comparisons || []).map((c) => c.comparisonId),
    formulaIds: (s.formulas || []).map((f) => f.formulaId),
    confusionIds: confusions,
    prerequisiteConceptIds: s.requiredConcepts
      .flatMap((u) => conceptById.get(u.conceptId)?.prerequisites || [])
      .filter((id, i, arr) => arr.indexOf(id) === i),
    learningObjectives: OBJECTIVES[s.id] || [s.purpose],
    teachingSequence: s.sequence.map((beat) => ({
      id: beat.id,
      label: beat.label,
      kind: SEQUENCE_KIND[beat.kind] || "explain",
      conceptIds: beat.conceptIds || [],
      detail: beat.detail,
      washHint:
        beat.kind === "formula"
          ? "formula"
          : beat.kind === "comparison"
            ? "table"
            : beat.kind === "definition"
              ? "definition-card"
              : beat.kind === "exam-note"
                ? "callout"
                : beat.kind === "taxonomy"
                  ? "list"
                  : "prose",
    })),
    mustPreserve: s.coverage.mustPreserve,
    transitions: {
      entryFrom: idx > 0 ? composition.sections[idx - 1].id : undefined,
      exitTo:
        idx < composition.sections.length - 1
          ? composition.sections[idx + 1].id
          : undefined,
    },
    cardPolicy: [
      "Cards only for strong definitions, key rules, and exam traps — not every concept.",
    ],
    tablePolicy: [
      "Tables only where aligned dimensions matter (flow modes, topologies, categories, de facto/de jure).",
    ],
  };
});

// Knowledge ownership matrix
const coverage = [];
const seenPrimary = new Set();

function assign(entityId, kind, primarySectionId, depth, mustPreserve, extra = {}) {
  const key = `${kind}:${entityId}`;
  if (seenPrimary.has(key)) {
    const existing = coverage.find((a) => `${a.kind}:${a.entityId}` === key);
    if (existing && !existing.referencedFrom.includes(primarySectionId)) {
      existing.referencedFrom.push(primarySectionId);
    }
    return;
  }
  seenPrimary.add(key);
  coverage.push({
    entityId,
    kind,
    primarySectionId,
    teachingRole: mustPreserve ? "primary" : extra.role || "primary",
    depth,
    mustPreserve,
    referencedFrom: extra.referencedFrom || [],
    sourceRefs: extra.sourceRefs || [],
    reason: extra.reason,
  });
}

for (const s of sections) {
  const d = s.depth;
  for (const tid of s.topicIds) {
    assign(tid, "topic", s.id, d, true, {
      sourceRefs: topicById.get(tid)?.sourceRefs || [],
    });
  }
  for (const cid of s.conceptIds) {
    const c = conceptById.get(cid);
    assign(cid, "concept", s.id, d, true, {
      sourceRefs: c?.sourceRefs || [],
      referencedFrom: composition.crossTopicConnections
        .filter((x) => x.toConceptId === cid || x.fromConceptId === cid)
        .map((x) => x.placementSectionId)
        .filter((id) => id !== s.id),
    });
  }
  for (const rid of s.relationshipIds) assign(rid, "relationship", s.id, d, true);
  for (const did of s.definitionIds) assign(did, "definition", s.id, d, true);
  for (const eid of s.exampleIds) assign(eid, "example", s.id, "APPLIED", true);
  for (const cmp of s.comparisonIds) assign(cmp, "comparison", s.id, d, true);
  for (const fid of s.formulaIds) assign(fid, "formula", s.id, "APPLIED", true);
  for (const conf of s.confusionIds) assign(conf, "confusion", s.id, "EXAM-CRITICAL", true);
}

for (const req of composition.coverageRequirements) {
  assign(req.id, "coverage-requirement", req.assignedSectionId, "DETAILED", true, {
    reason: req.requirement,
  });
}

const mustGuards = map.compressionGuard.filter((g) => g.preservationPriority === "must");
const guardSection = {
  "guard-five-components": "section-data-communication",
  "guard-effectiveness-four": "section-data-communication",
  "guard-flow-three": "section-data-flow",
  "guard-topology-four": "section-physical-structures",
  "guard-mesh-formulas": "section-physical-structures",
  "guard-throughput-delay": "section-networks-criteria",
  "guard-internet-history": "section-internet",
  "guard-protocol-elements": "section-protocols",
  "guard-de-facto-de-jure": "section-standards",
  "guard-heterogeneous-internetwork": "section-internetwork",
};
const guardDepth = {
  "guard-five-components": "EXPLANATORY",
  "guard-effectiveness-four": "EXPLANATORY",
  "guard-flow-three": "EXPLANATORY",
  "guard-topology-four": "DETAILED",
  "guard-mesh-formulas": "APPLIED",
  "guard-throughput-delay": "EXPLANATORY",
  "guard-internet-history": "EXPLANATORY",
  "guard-protocol-elements": "DETAILED",
  "guard-de-facto-de-jure": "DETAILED",
  "guard-heterogeneous-internetwork": "EXPLANATORY",
};
const guardAs = {
  "guard-five-components":
    "complete five-item taxonomy in prose/list + protocol analogy — not one bullet",
  "guard-effectiveness-four": "four characteristics with jitter example beside them",
  "guard-flow-three": "three modes with immediate comparison + device examples",
  "guard-topology-four": "each topology with structure, pros/cons, failure mode",
  "guard-mesh-formulas": "both formulas with conditions, n=6 example, links-vs-ports trap",
  "guard-throughput-delay": "explicit relationship beat, not two glossary lines",
  "guard-internet-history": "timeline narrative + TCP/IP roles + ISP hierarchy",
  "guard-protocol-elements": "syntax/semantics/timing triad with rate-mismatch example",
  "guard-de-facto-de-jure": "paired definitions + comparison + org/RFC process",
  "guard-heterogeneous-internetwork": "worked two-LAN + WAN scenario as section core",
};

const compressionGuards = mustGuards.map((g) => ({
  id: g.id,
  kind: g.kind,
  description: g.description,
  appearsAs: guardAs[g.id] || g.description,
  appearsInSectionId: guardSection[g.id] || "section-integrated-review",
  requiredDepth: guardDepth[g.id] || "EXPLANATORY",
}));

const plan = {
  schemaVersion: "cgp.chapter-plan.v1",
  generatedAt: "2026-09-11T22:00:00.000Z",
  basedOn: {
    topicMap: "cgp.topic-map.v1",
    deepTopics: "cgp.deep-topics.v1",
    validation: "cgp.validation.v1",
    composition: "cgp.composition.v1",
  },
  metadata: {
    chapterId: "computer-networks-ch1",
    title: "Introduction to Data Communications and Networking",
    arabicTitleHint: "مقدمة في اتصالات البيانات والشبكات",
    subject: "computer-networks",
    language: "ar",
  },
  chapterPurpose:
    "Comprehensive exam-aware study chapter derived from the validated Forouzan Ch.1 source: define core concepts, teach mechanisms and relationships, place source-backed examples/formulas beside their concepts, and preserve distinctions the old compressed sample lost.",
  learningArc: [
    "WHAT — definitions and taxonomies",
    "WHY — effectiveness, interoperation, historical need",
    "HOW — representation, flow, topology, TCP/IP roles, RFC process",
    "EXAMPLE — jitter, mesh n=6, heterogeneous internetwork, rate mismatch",
    "COMPARE — flow modes, topologies, categories, de facto/de jure",
    "APPLY — classification and calculation",
    "CHECK — integrated review map",
  ],
  chapterLearningObjectives: composition.chapterObjectives,
  dependencyGraph: [
    { from: "concept-data", to: "concept-bit-pattern", note: "information must be represented" },
    { from: "concept-data-communications", to: "concept-five-components", note: "system anatomy" },
    { from: "concept-five-components", to: "concept-protocol-elements", note: "protocol is component #5, deepened later" },
    { from: "concept-transmission-medium", to: "concept-simplex", note: "flow mode constrains medium use" },
    { from: "concept-network", to: "concept-network-criteria", note: "quality criteria" },
    { from: "concept-network-criteria", to: "concept-topology", note: "structure trades criteria" },
    { from: "concept-point-to-point", to: "concept-topology", note: "connection types before topologies" },
    { from: "concept-topology", to: "concept-lan", note: "local designs become categories" },
    { from: "concept-lan", to: "concept-internetwork", note: "interconnection" },
    { from: "concept-internetwork", to: "concept-internet-global", note: "Internet is notable internetwork" },
    { from: "concept-tcp-ip-split", to: "concept-protocol-elements", note: "concrete protocol architecture" },
    { from: "concept-protocol-elements", to: "concept-standards-need", note: "agreed-upon rules" },
  ],
  sections,
  knowledgeCoverage: coverage,
  compositionRules: [
    "Never use public/samples/computer-networks-ch1.md as the structural template.",
    "No arbitrary page or word target — length follows mustPreserve + depth + examples.",
    "Teach examples/comparisons/formulas beside the concept they explain.",
    "Do not cardify every concept; cards for strong definitions, key rules, exam traps.",
    "Tables only for genuinely aligned dimensions.",
    "Only source-backed formulas in core: n(n−1)/2, n−1, 2^bits.",
    "Shannon/SNR/T=L/B stay out of core until separately sourced.",
    "Each concept has one primary teaching home; later mentions are references.",
    "Preserve internet (lowercase) vs Internet (uppercase).",
    "When shortening, compress repetition/generic prose — never must knowledge.",
  ],
  externalContextPolicy: [
    {
      id: "extra-shannon",
      title: "Shannon capacity",
      decision: "needs-separate-source",
      note: validation.externalContext.find((e) => e.id === "extra-shannon")?.note || "",
    },
    {
      id: "extra-snr-db",
      title: "SNR in dB",
      decision: "needs-separate-source",
      note: "Not in attached Ch.1 source.",
    },
    {
      id: "extra-transmission-time",
      title: "T = L/B",
      decision: "needs-separate-source",
      note: "Not in attached Ch.1 source.",
    },
    {
      id: "extra-ipconfig",
      title: "Windows ipconfig lab",
      decision: "optional",
      placement: "Optional appendix after review — clearly non-source",
      note: "Practical enrichment only.",
    },
    {
      id: "extra-mb-mb-trap",
      title: "MB vs Mb trap",
      decision: "optional",
      placement: "Optional exam-trap sidebar if needed",
      note: "Not in Ch.1 extract; do not present as source-core.",
    },
    {
      id: "extra-bandwidth-definition",
      title: "Bandwidth definition card",
      decision: "future-chapter",
      note: "Source teaches throughput/delay; bandwidth card would recreate wrong emphasis.",
    },
  ],
  reviewPlan: {
    purpose: "Structured exam map from validated knowledge; wording authored in CGP-4.",
    categories: composition.reviewPlan.categories,
    practiceClassification: {
      core: [
        "Review Q1 five components",
        "Q3 three criteria",
        "Q7 half vs full duplex",
        "Q8 topology advantages",
        "Q9 mesh/ring/bus/star link counts",
        "Q11 internet vs Internet",
        "Q12 why protocols",
        "Q13 why standards",
        "Q15 16-bit colors",
        "Q16 six-device mesh",
        "Q18 home LAN classification",
      ],
      optionalResearch: [
        "Q26 OSI model site",
        "Q27 ANSI activities",
        "Q28 IEEE activities",
        "Q29 IETF/RFC types",
      ],
      futureExpansion: [
        "Advanced routing",
        "Subnetting",
        "Modern Unicode encoding note (separately sourced)",
      ],
    },
    exclusions: composition.reviewPlan.exclusions,
  },
  provenancePlan: {
    washCommentPattern: "<!-- source: {document} p.{page} -->",
    rule: "Every SOURCE_CORE block in CGP-4 carries provenance from knowledgeCoverage sourceRefs / deep-topics.",
    externalMarking:
      "External enrichment (if any) is labeled non-source and never claims Forouzan Ch.1 pages.",
  },
  compressionGuards,
  qualityChecks: {
    allCoreTopicsAssigned: deep.topics
      .filter((t) => t.importance === "core")
      .every((t) => coverage.some((a) => a.kind === "topic" && a.entityId === t.topicId)),
    allMustPreserveAssigned: compressionGuards.every((g) =>
      sections.some((s) => s.id === g.appearsInSectionId && s.mustPreserve.length > 0),
    ),
    allSourceFormulasAssigned: ["formula-mesh-links", "formula-mesh-ports", "formula-color-count"].every(
      (id) => coverage.some((a) => a.kind === "formula" && a.entityId === id),
    ),
    noDuplicatePrimaryConceptTeaching: true,
    externalNotSmuggledIntoCore: composition.externalEnrichment.every(
      (e) => e.decision !== "include" || e.provenance === "EXTERNAL_ENRICHMENT",
    ),
    noArbitraryPageTarget: true,
  },
  omissions: [
    {
      entityId: "block-1.5-reading-list",
      reason: "Recommended reading/sites are not teachable core knowledge",
      disposition: "optional context in CGP-4 if space allows",
    },
    {
      entityId: "block-1.6-key-terms-dump",
      reason: "Glossary terms already covered via definitions",
      disposition: "no separate term-dump section",
    },
    {
      entityId: "research-activities-26-29",
      reason: "Site-research activities are optional research, not core exam teaching",
      disposition: "optionalResearch in reviewPlan",
    },
  ],
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(plan, null, 2) + "\n", "utf8");

console.log("wrote", OUT);
console.log({
  sections: plan.sections.length,
  coverage: plan.knowledgeCoverage.length,
  guards: plan.compressionGuards.length,
  quality: plan.qualityChecks,
  depthCounts: sections.reduce((acc, s) => {
    acc[s.depth] = (acc[s.depth] || 0) + 1;
    return acc;
  }, {}),
});
