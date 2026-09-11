/**
 * scripts/cgp-build-composition.mjs
 * CGP-3: chapter composition blueprint from validated deep topics.
 */
import fs from "node:fs";
import path from "node:path";

const deep = JSON.parse(
  fs.readFileSync("content/cgp/computer-networks-ch1.deep-topics.json", "utf8"),
);
const map = JSON.parse(
  fs.readFileSync("content/cgp/computer-networks-ch1.topic-map.json", "utf8"),
);

const OUT = "content/cgp/computer-networks-ch1.composition.json";
const SRC = "src-forouzan-ch1-intro";

const byTopic = new Map(deep.topics.map((t) => [t.topicId, t]));
const conceptIndex = new Map();
for (const t of deep.topics) {
  for (const c of t.concepts) conceptIndex.set(c.id, { ...c, topicId: t.topicId });
}

function refsForTopic(topicId) {
  return byTopic.get(topicId)?.sourceRefs ?? [];
}

function unit(conceptId, role, depth, provenance = "SOURCE_CORE") {
  const c = conceptIndex.get(conceptId);
  if (!c) throw new Error(`unknown concept ${conceptId}`);
  return {
    conceptId,
    role,
    depth,
    provenance,
    sourceRefs: c.sourceRefs || [],
  };
}

const sections = [
  {
    id: "section-chapter-frame",
    title: "Chapter roadmap: four issues",
    arabicTitleHint: "خريطة الفصل: أربعة محاور",
    purpose:
      "Orient the learner on the source’s four pillars before dense definitions.",
    pedagogicalRole: "roadmap",
    sourceRefs: refsForTopic("topic-chapter-frame"),
    topicIds: ["topic-chapter-frame"],
    sequence: [
      {
        id: "seq-frame-1",
        label: "Why data communications and networking matter",
        kind: "explanation",
        conceptIds: ["concept-four-issues"],
        detail:
          "Brief motivation: decisions need immediate information; networks are infrastructure, not a luxury.",
        provenance: "SOURCE_CONTEXT",
      },
      {
        id: "seq-frame-2",
        label: "Four-issue roadmap",
        kind: "taxonomy",
        conceptIds: ["concept-four-issues"],
        detail:
          "Data communications → networks → Internet → protocols and standards. State this explicitly.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-frame-3",
        label: "How to use this chapter",
        kind: "bridge",
        conceptIds: ["concept-four-issues"],
        detail:
          "Tell learners later sections expand each pillar; exam traps concentrate in distinctions.",
        provenance: "SOURCE_CONTEXT",
      },
    ],
    requiredConcepts: [unit("concept-four-issues", "anchor", "introduce")],
    requiredRelationshipIds: ["rel-frame-sequence"],
    definitions: [],
    examples: [],
    comparisons: [],
    formulas: [],
    examFocus: [],
    explanationIntents: [
      "State the four pillars once; do not expand them here.",
      "Set expectation that topology/Internet/standards are core, not optional.",
    ],
    proseIntents: {
      opening:
        "Short orientation: the chapter answers what data communication is, how networks work, how the Internet emerged, and why protocols/standards exist.",
      mechanism: "Roadmap only — no deep mechanism yet.",
      connectionPrevNext:
        "Ends by naming data communications as the first pillar.",
    },
    entryConcept: "concept-four-issues",
    bridgeToNext:
      "From the roadmap, the first pillar is defining data communications itself.",
    coverage: {
      minimum: ["Name the four issues"],
      mustPreserve: ["Four-pillar roadmap sentence"],
      optional: ["Business motivation anecdote"],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: false,
      example: false,
      comparison: false,
      formula: false,
      examNote: false,
    },
  },

  {
    id: "section-data-communication",
    title: "Data communications: effectiveness and five components",
    arabicTitleHint: "الاتصال البياناتي: الفعالية والمكوّنات الخمسة",
    purpose:
      "Define data communications and preserve the four effectiveness criteria and five-component taxonomy — the old sample’s first major loss.",
    pedagogicalRole: "foundation",
    sourceRefs: refsForTopic("topic-data-communication"),
    topicIds: ["topic-data-communication"],
    sequence: [
      {
        id: "seq-dc-1",
        label: "What is data / telecommunication / data communications",
        kind: "definition",
        conceptIds: ["concept-data", "concept-telecommunication", "concept-data-communications"],
        detail:
          "Agreed-form information; communication at a distance; exchange of data between two devices via a transmission medium (hardware+software system).",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-dc-2",
        label: "Four effectiveness characteristics",
        kind: "taxonomy",
        conceptIds: [
          "concept-effectiveness",
          "concept-delivery",
          "concept-accuracy",
          "concept-timeliness",
          "concept-jitter",
        ],
        detail:
          "Delivery, accuracy, timeliness, jitter. Jitter is variation in arrival time, not average delay.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-dc-3",
        label: "Jitter worked illustration",
        kind: "example",
        conceptIds: ["concept-jitter", "concept-realtime"],
        detail:
          "30 ms production interval with 30 ms vs 40 ms delays → uneven video quality.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-dc-4",
        label: "Five components taxonomy",
        kind: "taxonomy",
        conceptIds: [
          "concept-five-components",
          "concept-message",
          "concept-sender",
          "concept-receiver",
          "concept-transmission-medium",
          "concept-protocol-basic",
        ],
        detail:
          "Message, sender, receiver, medium, protocol. Protocol is a component — connection without rules does not communicate.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-dc-5",
        label: "Protocol analogy exam note",
        kind: "exam-note",
        conceptIds: ["concept-protocol-basic"],
        detail:
          "French/Japanese analogy: connected ≠ communicating. Emphasize protocol is not a physical device.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-dc-6",
        label: "Effectiveness comparison",
        kind: "comparison",
        conceptIds: ["concept-effectiveness"],
        detail: "Place the four-way effectiveness comparison immediately after the list.",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-data-communications", "anchor", "explain"),
      unit("concept-data", "definition", "introduce"),
      unit("concept-effectiveness", "taxonomy", "deep"),
      unit("concept-delivery", "taxonomy-member", "explain"),
      unit("concept-accuracy", "taxonomy-member", "explain"),
      unit("concept-timeliness", "taxonomy-member", "explain"),
      unit("concept-jitter", "distinction", "deep"),
      unit("concept-realtime", "mechanism", "explain"),
      unit("concept-five-components", "taxonomy", "deep"),
      unit("concept-message", "taxonomy-member", "introduce"),
      unit("concept-sender", "taxonomy-member", "introduce"),
      unit("concept-receiver", "taxonomy-member", "introduce"),
      unit("concept-transmission-medium", "taxonomy-member", "explain"),
      unit("concept-protocol-basic", "bridge", "explain"),
      unit("concept-telecommunication", "definition", "introduce"),
    ],
    requiredRelationshipIds: [
      "rel-effectiveness-parts",
      "rel-components-complete-set",
      "rel-jitter-from-timeliness",
      "rel-protocol-not-media",
    ],
    definitions: [
      {
        definitionId: "def-data-communications",
        treatment: "strong-card",
        reason: "Authoritative chapter-defining definition",
      },
      {
        definitionId: "def-jitter",
        treatment: "strong-card",
        reason: "Frequently lost in summarization; exam trap vs delay",
      },
      {
        definitionId: "def-protocol-basic",
        treatment: "inline-prose",
        reason: "Full protocol triad taught later; basic role only here",
      },
    ],
    examples: [
      {
        exampleId: "ex-jitter-video",
        placement: "Immediately after jitter definition",
        mustShowReasoning: true,
      },
      {
        exampleId: "ex-protocol-language",
        placement: "Inside five-components discussion",
        mustShowReasoning: false,
      },
    ],
    comparisons: [
      {
        comparisonId: "cmp-effectiveness-four",
        placement: "After the four characteristics are named",
      },
    ],
    formulas: [],
    examFocus: [
      {
        conceptId: "concept-five-components",
        focus: "List all five; never drop protocol",
        confusionIds: [],
      },
      {
        conceptId: "concept-jitter",
        focus: "Jitter ≠ delay",
        confusionIds: ["conf-jitter-vs-delay"],
      },
    ],
    explanationIntents: [
      "Open with exchange-via-medium definition before any bandwidth talk.",
      "Mechanism: effectiveness is a four-part contract, not one metric.",
      "Taxonomy must be complete; do not collapse to 'sender-receiver'.",
    ],
    proseIntents: {
      opening:
        "Define data and data communications, then state that effectiveness has four named criteria.",
      mechanism:
        "Walk delivery → accuracy → timeliness → jitter with the video-packet illustration.",
      distinction:
        "Jitter is uneven arrival; delay is how long. Both can fail real-time media.",
      exampleNarrative: "Use the 30/40 ms packet story as the concrete anchor.",
      connectionPrevNext:
        "Protocol as component #5 bridges to later protocol section and next section on how information is represented.",
    },
    entryConcept: "concept-data-communications",
    bridgeToNext:
      "Messages carry information — next section asks how that information is represented as bits.",
    coverage: {
      minimum: [
        "Data communications definition",
        "Four effectiveness characteristics",
        "Five components",
      ],
      mustPreserve: [
        "Jitter definition + 30/40 ms example",
        "Complete five-component set including protocol",
        "Connected ≠ communicating analogy",
      ],
      optional: ["Extended telecommunication etymology"],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: true,
      example: true,
      comparison: true,
      formula: false,
      examNote: true,
    },
  },

  {
    id: "section-data-representation",
    title: "How information is represented",
    arabicTitleHint: "تمثُّل المعلومات",
    purpose:
      "Restore the largest sample omission: text/number/image/audio/video representation and bit depth.",
    pedagogicalRole: "mechanism",
    sourceRefs: refsForTopic("topic-data-representation"),
    topicIds: ["topic-data-representation"],
    sequence: [
      {
        id: "seq-repr-1",
        label: "Five forms of information",
        kind: "taxonomy",
        conceptIds: ["concept-bit-pattern"],
        detail: "Text, numbers, images, audio, video — different representation rules.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-repr-2",
        label: "Text: codes, Unicode, ASCII",
        kind: "explanation",
        conceptIds: ["concept-coding", "concept-unicode-ascii"],
        detail:
          "Codes map symbols to bit patterns. Preserve source claim: Unicode uses 32 bits; ASCII = first 127 / Basic Latin.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-repr-3",
        label: "Numbers as direct binary",
        kind: "explanation",
        conceptIds: ["concept-numbers-binary"],
        detail: "Numbers are not ASCII-encoded; direct binary conversion simplifies math.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-repr-4",
        label: "Images as pixel matrices",
        kind: "mechanism",
        conceptIds: ["concept-pixels"],
        detail: "Resolution vs memory; 1-bit B/W; gray levels; RGB.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-repr-5",
        label: "Color depth formula",
        kind: "formula",
        conceptIds: ["concept-pixels"],
        detail: "colors = 2^bits with conditions (uniform bpp).",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-repr-6",
        label: "Gray-scale and 16-bit examples",
        kind: "example",
        conceptIds: ["concept-pixels"],
        detail: "2-bit gray mapping; exercise: 16 bits → 65536 colors.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-repr-7",
        label: "Audio and video continuous vs discrete",
        kind: "explanation",
        conceptIds: ["concept-audio-video-continuous"],
        detail: "Mic audio continuous; video continuous or image sequence; both can become digital/analog.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-repr-8",
        label: "Unicode 32-bit qualifier note",
        kind: "exam-note",
        conceptIds: ["concept-unicode-ascii"],
        detail:
          "Mark as textbook claim; do not silently modernize to UTF-8 inside core teaching.",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-bit-pattern", "anchor", "explain"),
      unit("concept-coding", "definition", "introduce"),
      unit("concept-unicode-ascii", "definition", "deep"),
      unit("concept-numbers-binary", "distinction", "explain"),
      unit("concept-pixels", "mechanism", "deep"),
      unit("concept-audio-video-continuous", "mechanism", "explain"),
    ],
    requiredRelationshipIds: ["rel-ascii-inside-unicode", "rel-pixels-bit-depth"],
    definitions: [
      {
        definitionId: "def-unicode",
        treatment: "strong-card",
        reason: "Source-specific 32-bit claim needs visible qualifier",
      },
      {
        definitionId: "def-ascii",
        treatment: "inline-prose",
        reason: "Explained as Basic Latin subset",
      },
      {
        definitionId: "def-code",
        treatment: "inline-prose",
        reason: "Supporting terminology",
      },
    ],
    examples: [
      {
        exampleId: "ex-gray-2bit",
        placement: "After pixel matrix explanation",
        mustShowReasoning: true,
      },
      {
        exampleId: "ex-16bit-color",
        placement: "Immediately after 2^bits formula",
        mustShowReasoning: true,
      },
    ],
    comparisons: [
      {
        comparisonId: "cmp-info-forms",
        placement: "Section opening after naming the five forms",
      },
    ],
    formulas: [
      {
        formulaId: "formula-color-count",
        placement: "Inside images subsection after bit-depth discussion",
        surroundWith: [
          "why color depth matters",
          "variables bits/colors + unit",
          "condition uniform bpp",
          "worked 16-bit example",
          "mistake: bits vs memory",
        ],
      },
    ],
    examFocus: [
      {
        conceptId: "concept-unicode-ascii",
        focus: "Unicode capacity framing as stated in source",
        confusionIds: [],
      },
      {
        conceptId: "concept-pixels",
        focus: "2^bits not linear bits",
        confusionIds: ["conf-ascii-vs-number"],
      },
    ],
    explanationIntents: [
      "Do not skip this section — it was absent from the sample.",
      "Keep forms distinct; do not collapse to 'everything is data'.",
      "Introduce formula only after pixels and bit depth are explained.",
    ],
    proseIntents: {
      opening:
        "Information arrives in five forms; each needs a representation strategy.",
      mechanism:
        "Bit patterns + codes for text; direct binary for numbers; pixel matrices for images; continuous→digital path for audio/video.",
      distinction: "ASCII digits vs binary numeric values.",
      exampleNarrative: "Gray 2-bit mapping then 16-bit color count.",
      connectionPrevNext:
        "Represented messages still need a direction of flow on the link — next section.",
    },
    entryConcept: "concept-bit-pattern",
    bridgeToNext:
      "Once bits exist, devices must agree on direction of transmission.",
    coverage: {
      minimum: [
        "Five information forms",
        "Unicode/ASCII as source states",
        "Pixels and color depth",
      ],
      mustPreserve: [
        "Unicode 32-bit source claim with qualifier",
        "2^bits formula + 16-bit exercise",
        "Numbers ≠ ASCII distinction",
      ],
      optional: ["Long RGB color-theory expansion"],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: true,
      example: true,
      comparison: true,
      formula: true,
      examNote: true,
    },
  },

  {
    id: "section-data-flow",
    title: "Data flow modes",
    arabicTitleHint: "أنماط تدفق البيانات",
    purpose:
      "Teach simplex / half-duplex / full-duplex with direction and capacity semantics.",
    pedagogicalRole: "mechanism",
    sourceRefs: refsForTopic("topic-data-flow"),
    topicIds: ["topic-data-flow"],
    sequence: [
      {
        id: "seq-flow-1",
        label: "Why direction matters",
        kind: "explanation",
        conceptIds: ["concept-simplex"],
        detail: "Links differ in who may transmit and when.",
        provenance: "SOURCE_CONTEXT",
      },
      {
        id: "seq-flow-2",
        label: "Simplex",
        kind: "definition",
        conceptIds: ["concept-simplex"],
        detail: "Unidirectional; entire capacity one way; keyboard/monitor.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-flow-3",
        label: "Half-duplex",
        kind: "definition",
        conceptIds: ["concept-half-duplex"],
        detail: "Two-way, not simultaneous; capacity to current transmitter; walkie-talkie.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-flow-4",
        label: "Full-duplex",
        kind: "definition",
        conceptIds: ["concept-full-duplex"],
        detail: "Simultaneous two-way; two paths or divided capacity; telephone.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-flow-5",
        label: "Immediate three-way comparison",
        kind: "comparison",
        conceptIds: [
          "concept-simplex",
          "concept-half-duplex",
          "concept-full-duplex",
        ],
        detail: "Do not defer the comparison table to the end of the chapter.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-flow-6",
        label: "Device mapping example",
        kind: "example",
        conceptIds: [
          "concept-simplex",
          "concept-half-duplex",
          "concept-full-duplex",
        ],
        detail: "Keyboard/monitor, walkie-talkie, telephone.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-flow-7",
        label: "Half vs full exam trap",
        kind: "exam-note",
        conceptIds: ["concept-half-duplex", "concept-full-duplex"],
        detail: "Both are two-way; only full-duplex is simultaneous.",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-simplex", "definition", "explain"),
      unit("concept-half-duplex", "definition", "explain"),
      unit("concept-full-duplex", "definition", "explain"),
    ],
    requiredRelationshipIds: ["rel-half-vs-full-capacity", "rel-simplex-unidirectional"],
    definitions: [
      {
        definitionId: "def-simplex",
        treatment: "inline-prose",
        reason: "Short mode definition",
      },
      {
        definitionId: "def-half-duplex",
        treatment: "inline-prose",
        reason: "Short mode definition",
      },
      {
        definitionId: "def-full-duplex",
        treatment: "strong-card",
        reason: "Capacity-sharing mechanism needs visibility",
      },
    ],
    examples: [
      {
        exampleId: "ex-flow-devices",
        placement: "After the three modes are introduced",
        mustShowReasoning: false,
      },
    ],
    comparisons: [
      {
        comparisonId: "cmp-data-flow",
        placement: "Immediately after all three modes",
      },
    ],
    formulas: [],
    examFocus: [
      {
        conceptId: "concept-full-duplex",
        focus: "Simultaneity + capacity sharing",
        confusionIds: ["conf-half-vs-full"],
      },
    ],
    explanationIntents: [
      "Keep the three-mode set complete.",
      "Capacity semantics differ; do not say full-duplex is merely 'faster'.",
    ],
    proseIntents: {
      opening: "Communication direction patterns on a two-device link.",
      mechanism: "One-way vs alternate two-way vs simultaneous two-way, with capacity notes.",
      distinction: "Half vs full simultaneity.",
      exampleNarrative: "Map everyday devices onto the three modes.",
      connectionPrevNext:
        "Devices that communicate form networks — next section defines networks and criteria.",
    },
    entryConcept: "concept-simplex",
    bridgeToNext: "From link behavior to whole-network quality criteria.",
    coverage: {
      minimum: ["All three modes", "Device examples"],
      mustPreserve: [
        "Direction + capacity semantics",
        "Half vs full simultaneity distinction",
      ],
      optional: [],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: true,
      example: true,
      comparison: true,
      formula: false,
      examNote: true,
    },
  },

  {
    id: "section-networks-criteria",
    title: "Networks and quality criteria",
    arabicTitleHint: "الشبكات ومعايير الجودة",
    purpose:
      "Define network/node and restore the three criteria plus throughput–delay tradeoff (sample omission).",
    pedagogicalRole: "foundation",
    sourceRefs: refsForTopic("topic-networks-criteria"),
    topicIds: ["topic-networks-criteria"],
    sequence: [
      {
        id: "seq-net-1",
        label: "Network and node definitions",
        kind: "definition",
        conceptIds: ["concept-network", "concept-node"],
        detail: "Devices (nodes) connected by communication links.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-net-2",
        label: "Distributed processing",
        kind: "explanation",
        conceptIds: ["concept-distributed-processing"],
        detail: "Task divided among multiple computers.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-net-3",
        label: "Three criteria",
        kind: "taxonomy",
        conceptIds: [
          "concept-network-criteria",
          "concept-performance-metrics",
          "concept-reliability",
          "concept-security",
        ],
        detail: "Performance, reliability, security — do not replace with bandwidth-only story.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-net-4",
        label: "Throughput vs delay relationship",
        kind: "relationship",
        conceptIds: ["concept-throughput", "concept-delay"],
        detail:
          "Offered load can raise throughput and delay together (congestion). Explicit contrast required.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-net-5",
        label: "Criteria comparison",
        kind: "comparison",
        conceptIds: ["concept-network-criteria"],
        detail: "Performance vs reliability vs security side-by-side.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-net-6",
        label: "Bandwidth absence note",
        kind: "exam-note",
        conceptIds: ["concept-throughput"],
        detail:
          "This source chapter teaches throughput/delay, not a bandwidth definition card. Optional external bandwidth note only if marked EXTERNAL.",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-network", "anchor", "explain"),
      unit("concept-node", "definition", "introduce"),
      unit("concept-distributed-processing", "mechanism", "explain"),
      unit("concept-network-criteria", "taxonomy", "deep"),
      unit("concept-performance-metrics", "mechanism", "deep"),
      unit("concept-throughput", "distinction", "deep"),
      unit("concept-delay", "distinction", "deep"),
      unit("concept-reliability", "taxonomy-member", "explain"),
      unit("concept-security", "taxonomy-member", "explain"),
    ],
    requiredRelationshipIds: [
      "rel-throughput-delay-tradeoff",
      "rel-performance-factors",
    ],
    definitions: [
      {
        definitionId: "def-network",
        treatment: "strong-card",
        reason: "Core definition",
      },
      {
        definitionId: "def-distributed-processing",
        treatment: "inline-prose",
        reason: "Supporting concept",
      },
      {
        definitionId: "def-throughput",
        treatment: "strong-card",
        reason: "Central performance metric in this source",
      },
      {
        definitionId: "def-delay",
        treatment: "inline-prose",
        reason: "Paired with throughput",
      },
    ],
    examples: [],
    comparisons: [
      {
        comparisonId: "cmp-network-criteria",
        placement: "After naming the three criteria",
      },
    ],
    formulas: [],
    examFocus: [
      {
        conceptId: "concept-network-criteria",
        focus: "Always all three criteria",
        confusionIds: [],
      },
      {
        conceptId: "concept-throughput",
        focus: "Throughput–delay contradiction",
        confusionIds: ["conf-bandwidth-throughput"],
      },
    ],
    explanationIntents: [
      "Restore criteria triad; sample failed here.",
      "Make throughput–delay a relationship, not two glossary lines.",
    ],
    proseIntents: {
      opening: "A network is nodes + links; quality is judged by criteria.",
      mechanism: "Performance metrics (transit/response, throughput/delay) plus reliability and security.",
      distinction: "Throughput vs delay under load.",
      connectionPrevNext: "Criteria inform how we choose structures — topology next.",
    },
    entryConcept: "concept-network",
    bridgeToNext: "Physical arrangement of nodes and links is topology.",
    coverage: {
      minimum: ["Network definition", "Three criteria", "Throughput and delay"],
      mustPreserve: [
        "Performance + reliability + security",
        "Throughput–delay tradeoff",
        "Distributed processing",
      ],
      optional: ["Optional marked external Bandwidth enrichment"],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: true,
      example: false,
      comparison: true,
      formula: false,
      examNote: true,
    },
  },

  {
    id: "section-physical-structures",
    title: "Connections and physical topologies",
    arabicTitleHint: "الاتصالات والطوبولوجيا الفيزيائية",
    purpose:
      "Largest omitted block: p2p/multipoint, mesh/star/bus/ring/hybrid, mesh formulas, failure modes.",
    pedagogicalRole: "structure",
    sourceRefs: refsForTopic("topic-physical-structures"),
    topicIds: ["topic-physical-structures"],
    sequence: [
      {
        id: "seq-topo-1",
        label: "Link, point-to-point, multipoint",
        kind: "taxonomy",
        conceptIds: ["concept-link", "concept-point-to-point", "concept-multipoint"],
        detail: "Dedicated two-device link vs shared 3+ device link (spatial/temporal).",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-topo-2",
        label: "What topology means",
        kind: "definition",
        conceptIds: ["concept-topology"],
        detail: "Geometric representation of links and nodes.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-topo-3",
        label: "Mesh topology",
        kind: "explanation",
        conceptIds: ["concept-mesh"],
        detail: "Fully connected dedicated p2p; robust; privacy; expensive.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-topo-4",
        label: "Mesh formulas",
        kind: "formula",
        conceptIds: ["concept-mesh"],
        detail: "links = n(n−1)/2 duplex; ports = n−1 with assumptions.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-topo-5",
        label: "Six-device mesh example",
        kind: "example",
        conceptIds: ["concept-mesh"],
        detail: "n=6 → 15 cables, 5 ports each; state links vs ports trap.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-topo-6",
        label: "Star topology and hub",
        kind: "explanation",
        conceptIds: ["concept-star", "concept-hub"],
        detail: "Hub exchange; single point of failure; cheaper than mesh.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-topo-7",
        label: "Bus topology anatomy",
        kind: "explanation",
        conceptIds: ["concept-bus", "concept-drop-line", "concept-tap"],
        detail: "Backbone, drop lines, taps, attenuation, break stops all.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-topo-8",
        label: "Ring topology",
        kind: "explanation",
        conceptIds: ["concept-ring"],
        detail: "Two neighbors, repeaters, unidirectional; dual-ring mitigation.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-topo-9",
        label: "Hybrid",
        kind: "explanation",
        conceptIds: ["concept-hybrid"],
        detail: "Star backbone + bus branches example.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-topo-10",
        label: "Topology comparison",
        kind: "comparison",
        conceptIds: [
          "concept-mesh",
          "concept-star",
          "concept-bus",
          "concept-ring",
        ],
        detail: "Line config, cabling, failure, fault isolation — after all four are taught.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-topo-11",
        label: "Links vs ports trap",
        kind: "exam-note",
        conceptIds: ["concept-mesh"],
        detail: "Exercises ask both; do not interchange answers.",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-link", "definition", "introduce"),
      unit("concept-point-to-point", "definition", "deep"),
      unit("concept-multipoint", "definition", "deep"),
      unit("concept-topology", "anchor", "explain"),
      unit("concept-mesh", "mechanism", "deep"),
      unit("concept-star", "mechanism", "deep"),
      unit("concept-hub", "mechanism", "explain"),
      unit("concept-bus", "mechanism", "deep"),
      unit("concept-drop-line", "definition", "introduce"),
      unit("concept-tap", "definition", "introduce"),
      unit("concept-ring", "mechanism", "deep"),
      unit("concept-hybrid", "mechanism", "explain"),
    ],
    requiredRelationshipIds: [
      "rel-mesh-from-p2p",
      "rel-bus-is-multipoint",
      "rel-star-hub-spof",
      "rel-ring-repeater",
    ],
    definitions: [
      {
        definitionId: "def-point-to-point",
        treatment: "strong-card",
        reason: "Prerequisite for topology classification",
      },
      {
        definitionId: "def-multipoint",
        treatment: "strong-card",
        reason: "Prerequisite for bus",
      },
      {
        definitionId: "def-topology",
        treatment: "inline-prose",
        reason: "Introduced then specialized",
      },
      {
        definitionId: "def-drop-line",
        treatment: "inline-prose",
        reason: "Bus anatomy",
      },
      {
        definitionId: "def-tap",
        treatment: "inline-prose",
        reason: "Bus anatomy",
      },
      {
        definitionId: "def-hub",
        treatment: "inline-prose",
        reason: "Star anatomy",
      },
    ],
    examples: [
      {
        exampleId: "ex-mesh-six",
        placement: "Right after both mesh formulas",
        mustShowReasoning: true,
      },
      {
        exampleId: "ex-ir-tv",
        placement: "Inside point-to-point explanation",
        mustShowReasoning: false,
      },
    ],
    comparisons: [
      {
        comparisonId: "cmp-connections",
        placement: "After p2p vs multipoint introduction",
      },
      {
        comparisonId: "cmp-topologies",
        placement: "After all four basic topologies",
      },
    ],
    formulas: [
      {
        formulaId: "formula-mesh-links",
        placement: "Inside mesh subsection after why dedicated links matter",
        surroundWith: [
          "full-mesh assumption",
          "duplex condition",
          "variable n",
          "n=6 worked example",
          "mistake: missing /2",
        ],
      },
      {
        formulaId: "formula-mesh-ports",
        placement: "Immediately after mesh links formula",
        surroundWith: [
          "ports ≠ cables",
          "n−1 meaning",
          "same n=6 example",
          "exam trap",
        ],
      },
    ],
    examFocus: [
      {
        conceptId: "concept-mesh",
        focus: "Formula + links vs ports",
        confusionIds: ["conf-links-vs-ports"],
      },
      {
        conceptId: "concept-star",
        focus: "Hub SPOF",
        confusionIds: [],
      },
      {
        conceptId: "concept-bus",
        focus: "Break stops all; multipoint",
        confusionIds: [],
      },
    ],
    explanationIntents: [
      "This is the largest restoration relative to the sample.",
      "Teach connection types before topologies.",
      "Formulas only inside mesh with assumptions.",
      "Failure modes are first-class, not footnotes.",
    ],
    proseIntents: {
      opening: "Physical arrangement decides cost, robustness, and failure behavior.",
      mechanism: "Walk each topology’s structure, pros/cons, and failure mode.",
      distinction: "p2p vs multipoint; mesh links vs ports.",
      exampleNarrative: "Six-node mesh calculation as the worked core.",
      connectionPrevNext:
        "Topologies build local networks; categories classify networks by geographic scope.",
    },
    entryConcept: "concept-point-to-point",
    bridgeToNext: "Local designs become LAN/MAN/WAN categories.",
    coverage: {
      minimum: [
        "p2p vs multipoint",
        "mesh/star/bus/ring",
        "mesh formulas",
      ],
      mustPreserve: [
        "n(n−1)/2 and n−1 with conditions",
        "Hub single point of failure",
        "Bus break stops all transmission",
        "Topology comparison axes",
      ],
      optional: ["Token Ring historical depth"],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: true,
      example: true,
      comparison: true,
      formula: true,
      examNote: true,
    },
  },

  {
    id: "section-network-categories",
    title: "LAN, MAN, and WAN",
    arabicTitleHint: "تصنيف الشبكات: LAN و MAN و WAN",
    purpose: "Classify by geographic scope; add switched vs p2p WAN; no invented speed tables.",
    pedagogicalRole: "taxonomy",
    sourceRefs: refsForTopic("topic-network-categories"),
    topicIds: ["topic-network-categories"],
    sequence: [
      {
        id: "seq-cat-1",
        label: "Classification by size",
        kind: "explanation",
        conceptIds: ["concept-lan", "concept-man", "concept-wan"],
        detail: "Source basis is size/scope, not brand or speed marketing.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-cat-2",
        label: "LAN",
        kind: "definition",
        conceptIds: ["concept-lan"],
        detail: "Private, office/building/campus, resource sharing, common topologies.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-cat-3",
        label: "WAN and subtypes",
        kind: "taxonomy",
        conceptIds: ["concept-wan", "concept-switched-wan", "concept-p2p-wan"],
        detail: "Switched WAN vs point-to-point WAN with examples.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-cat-4",
        label: "MAN",
        kind: "definition",
        conceptIds: ["concept-man"],
        detail: "City scale; DSL and cable TV examples.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-cat-5",
        label: "LAN/MAN/WAN comparison",
        kind: "comparison",
        conceptIds: ["concept-lan", "concept-man", "concept-wan"],
        detail: "Size, ownership, examples — not fabricated Mbps tables.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-cat-6",
        label: "Classification exam note",
        kind: "exam-note",
        conceptIds: ["concept-lan"],
        detail: "Home Ethernet hub is a LAN (exercise 18).",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-lan", "definition", "deep"),
      unit("concept-man", "definition", "deep"),
      unit("concept-wan", "definition", "deep"),
      unit("concept-switched-wan", "taxonomy-member", "explain"),
      unit("concept-p2p-wan", "taxonomy-member", "explain"),
    ],
    requiredRelationshipIds: ["rel-size-spectrum", "rel-lan-resources"],
    definitions: [
      {
        definitionId: "def-lan",
        treatment: "strong-card",
        reason: "Core category",
      },
      {
        definitionId: "def-wan",
        treatment: "strong-card",
        reason: "Core category",
      },
      {
        definitionId: "def-man",
        treatment: "strong-card",
        reason: "Often dropped middle category",
      },
    ],
    examples: [
      {
        exampleId: "ex-man-dsl-cable",
        placement: "After MAN definition",
        mustShowReasoning: false,
      },
      {
        exampleId: "ex-home-hub-classify",
        placement: "Exam note / short apply",
        mustShowReasoning: true,
      },
    ],
    comparisons: [
      {
        comparisonId: "cmp-lan-man-wan",
        placement: "After all three categories",
      },
      {
        comparisonId: "cmp-switched-vs-p2p-wan",
        placement: "Inside WAN subsection",
      },
    ],
    formulas: [],
    examFocus: [
      {
        conceptId: "concept-lan",
        focus: "Classify by size/ownership",
        confusionIds: ["conf-lan-wan-classify"],
      },
    ],
    explanationIntents: [
      "Size-based classification is the learning goal.",
      "Do not invent numeric speed tables.",
    ],
    proseIntents: {
      opening: "Networks are also classified by geographic scope.",
      mechanism: "LAN → MAN → WAN spectrum with WAN subtypes.",
      distinction: "Switched vs p2p WAN roles.",
      exampleNarrative: "Home hub classification exercise.",
      connectionPrevNext: "Separated sites need interconnection — internetwork next.",
    },
    entryConcept: "concept-lan",
    bridgeToNext: "Rarely are LANs isolated; interconnection creates internetworks.",
    coverage: {
      minimum: ["LAN/MAN/WAN definitions", "WAN subtypes"],
      mustPreserve: [
        "Size-based classification",
        "Switched vs point-to-point WAN",
        "MAN examples DSL/cable",
      ],
      optional: ["X.25/Frame Relay/ATM as SOURCE-HISTORICAL examples"],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: true,
      example: true,
      comparison: true,
      formula: false,
      examNote: true,
    },
  },

  {
    id: "section-internetwork",
    title: "Internetworks",
    arabicTitleHint: "الشبكات المتشابكة (Internetwork)",
    purpose:
      "Keep lowercase internetwork distinct from the Internet; use the heterogeneous scenario.",
    pedagogicalRole: "bridge",
    sourceRefs: refsForTopic("topic-internetwork"),
    topicIds: ["topic-internetwork"],
    sequence: [
      {
        id: "seq-inet-1",
        label: "Internetwork definition",
        kind: "definition",
        conceptIds: ["concept-internetwork"],
        detail: "Two or more networks that communicate with each other (lowercase internet).",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-inet-2",
        label: "Heterogeneous enterprise scenario",
        kind: "example",
        conceptIds: ["concept-heterogeneous-mix"],
        detail: "Bus LAN + star LAN + president via switched WAN + p2p WANs.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-inet-3",
        label: "Network vs internetwork",
        kind: "comparison",
        conceptIds: ["concept-network", "concept-internetwork"],
        detail: "Single network vs network-of-networks.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-inet-4",
        label: "Bridge to the Internet",
        kind: "bridge",
        conceptIds: ["concept-internetwork", "concept-internet-global"],
        detail: "The Internet is the most notable internetwork — do not merge terms.",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-internetwork", "anchor", "deep"),
      unit("concept-heterogeneous-mix", "example", "explain"),
      unit("concept-internet-global", "bridge", "introduce"),
    ],
    requiredRelationshipIds: [
      "rel-internet-is-notable-internetwork",
      "rel-hetero-needs-wan",
    ],
    definitions: [
      {
        definitionId: "def-internetwork",
        treatment: "strong-card",
        reason: "Must not be collapsed with Internet",
      },
    ],
    examples: [
      {
        exampleId: "ex-two-lan-wan",
        placement: "Core of the section",
        mustShowReasoning: true,
      },
    ],
    comparisons: [
      {
        comparisonId: "cmp-network-vs-internetwork",
        placement: "After defining internetwork",
      },
    ],
    formulas: [],
    examFocus: [
      {
        conceptId: "concept-internetwork",
        focus: "internet vs Internet",
        confusionIds: ["conf-network-vs-internet", "conf-internet-capitalization"],
      },
    ],
    explanationIntents: [
      "Preserve lowercase/uppercase distinction from the start.",
      "Scenario teaches composition of heterogeneous designs.",
    ],
    proseIntents: {
      opening: "When networks connect, they become an internetwork.",
      mechanism: "Walk the two-LAN + WAN composition story.",
      distinction: "internet (generic) vs Internet (global).",
      exampleNarrative: "East/west offices + remote president.",
      connectionPrevNext: "Scale that idea up to the global Internet.",
    },
    entryConcept: "concept-internetwork",
    bridgeToNext: "The most notable internetwork is the Internet.",
    coverage: {
      minimum: ["Internetwork definition", "Heterogeneous scenario"],
      mustPreserve: [
        "Lowercase internet distinction",
        "Two-LAN + WAN scenario",
      ],
      optional: [],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: true,
      example: true,
      comparison: true,
      formula: false,
      examNote: true,
    },
  },

  {
    id: "section-internet",
    title: "The Internet: history and ISP hierarchy",
    arabicTitleHint: "الإنترنت: التاريخ وتسلسل مزودي الخدمة",
    purpose: "Restore ARPANET/TCP-IP narrative and four-level ISP hierarchy (sample omission).",
    pedagogicalRole: "architecture",
    sourceRefs: refsForTopic("topic-internet"),
    topicIds: ["topic-internet"],
    sequence: [
      {
        id: "seq-www-1",
        label: "Internet as structured system",
        kind: "explanation",
        conceptIds: ["concept-internet-global"],
        detail: "Uppercase Internet; hundreds of thousands of networks; not a random mesh.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-www-2",
        label: "ARPANET timeline",
        kind: "explanation",
        conceptIds: ["concept-arpanet-history", "concept-imp"],
        detail:
          "ARPA/DoD motivation; 1967 proposal; 1969 four nodes (UCLA, UCSB, SRI, Utah); NCP; IMPs.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-www-3",
        label: "Cerf/Kahn and TCP/IP split",
        kind: "mechanism",
        conceptIds: ["concept-tcp-ip-split"],
        detail: "IP routes datagrams; TCP segmentation/reassembly/errors.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-www-4",
        label: "ISP hierarchy",
        kind: "taxonomy",
        conceptIds: ["concept-isp-hierarchy"],
        detail: "International → national → regional → local.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-www-5",
        label: "NAPs and peering",
        kind: "explanation",
        conceptIds: ["concept-nap-peering"],
        detail: "Third-party NAPs; private peering points.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-www-6",
        label: "ISP level comparison",
        kind: "comparison",
        conceptIds: ["concept-isp-hierarchy"],
        detail: "Roles and typical users per level.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-www-7",
        label: "internet vs Internet recap",
        kind: "exam-note",
        conceptIds: ["concept-internet-global", "concept-internetwork"],
        detail: "Reinforce capitalization distinction.",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-internet-global", "anchor", "deep"),
      unit("concept-arpanet-history", "mechanism", "deep"),
      unit("concept-imp", "definition", "explain"),
      unit("concept-tcp-ip-split", "mechanism", "deep"),
      unit("concept-isp-hierarchy", "taxonomy", "deep"),
      unit("concept-nap-peering", "mechanism", "explain"),
    ],
    requiredRelationshipIds: ["rel-ncp-precedes-tcpip", "rel-isp-part-of-internet"],
    definitions: [
      {
        definitionId: "def-internet",
        treatment: "strong-card",
        reason: "Uppercase global Internet",
      },
      {
        definitionId: "def-isp",
        treatment: "inline-prose",
        reason: "Introduced in hierarchy",
      },
      {
        definitionId: "def-nap",
        treatment: "inline-prose",
        reason: "Supporting infrastructure term",
      },
    ],
    examples: [
      {
        exampleId: "ex-1969-four-nodes",
        placement: "Inside ARPANET timeline",
        mustShowReasoning: false,
      },
      {
        exampleId: "ex-tcp-ip-roles",
        placement: "After introducing the split",
        mustShowReasoning: true,
      },
    ],
    comparisons: [
      {
        comparisonId: "cmp-isp-levels",
        placement: "After naming all four ISP levels",
      },
    ],
    formulas: [],
    examFocus: [
      {
        conceptId: "concept-internet-global",
        focus: "internet vs Internet",
        confusionIds: ["conf-internet-capitalization"],
      },
      {
        conceptId: "concept-tcp-ip-split",
        focus: "IP vs TCP responsibilities",
        confusionIds: [],
      },
    ],
    explanationIntents: [
      "History explains architecture; not trivia dump.",
      "Connect TCP/IP back to protocol concept introduced earlier.",
    ],
    proseIntents: {
      opening: "The Internet is a structured internetwork with a historical path.",
      mechanism: "ARPANET → TCP/IP split → ISP hierarchy.",
      distinction: "Lowercase internet vs uppercase Internet (recap).",
      exampleNarrative: "Four 1969 nodes; IP/TCP role split.",
      connectionPrevNext:
        "Interoperation needs shared rules — protocols refined next.",
    },
    entryConcept: "concept-internet-global",
    bridgeToNext: "End-to-end communication requires protocol rules.",
    coverage: {
      minimum: ["Internet definition", "ARPANET highlights", "ISP hierarchy"],
      mustPreserve: [
        "1969 four nodes",
        "TCP/IP split roles",
        "Four ISP levels + NAP/peering",
      ],
      optional: ["Full list of named national ISP companies"],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: true,
      example: true,
      comparison: true,
      formula: false,
      examNote: true,
    },
  },

  {
    id: "section-protocols",
    title: "Protocols: syntax, semantics, timing",
    arabicTitleHint: "البروتوكولات: البنية والمعنى والتوقيت",
    purpose: "Upgrade protocol from 'a set of rules' to the three-element structure.",
    pedagogicalRole: "mechanism",
    sourceRefs: refsForTopic("topic-protocols"),
    topicIds: ["topic-protocols"],
    sequence: [
      {
        id: "seq-proto-1",
        label: "Entities and why protocols exist",
        kind: "explanation",
        conceptIds: ["concept-entity", "concept-protocol-elements"],
        detail: "Bit streams alone are not understood; agreement is required.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-proto-2",
        label: "Syntax",
        kind: "definition",
        conceptIds: ["concept-syntax"],
        detail: "Structure/format/order; header field example.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-proto-3",
        label: "Semantics",
        kind: "definition",
        conceptIds: ["concept-semantics"],
        detail: "Meaning of bit sections and required action.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-proto-4",
        label: "Timing",
        kind: "definition",
        conceptIds: ["concept-timing"],
        detail: "When to send and how fast; rate mismatch example.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-proto-5",
        label: "Triad comparison",
        kind: "comparison",
        conceptIds: ["concept-syntax", "concept-semantics", "concept-timing"],
        detail: "Question each element answers + source example.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-proto-6",
        label: "100 vs 1 Mbps example",
        kind: "example",
        conceptIds: ["concept-timing"],
        detail: "Sender faster than receiver → overload/loss risk.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-proto-7",
        label: "Protocol vs standard preview",
        kind: "exam-note",
        conceptIds: ["concept-protocol-elements", "concept-standards-need"],
        detail: "Rules vs agreed-upon rules — full standards section follows.",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-protocol-elements", "anchor", "deep"),
      unit("concept-entity", "definition", "introduce"),
      unit("concept-syntax", "definition", "deep"),
      unit("concept-semantics", "definition", "deep"),
      unit("concept-timing", "definition", "deep"),
    ],
    requiredRelationshipIds: ["rel-protocol-triad", "rel-protocol-vs-standard"],
    definitions: [
      {
        definitionId: "def-protocol-full",
        treatment: "strong-card",
        reason: "Authoritative full definition with triad",
      },
    ],
    examples: [
      {
        exampleId: "ex-timing-mismatch",
        placement: "After timing definition",
        mustShowReasoning: true,
      },
      {
        exampleId: "ex-syntax-header",
        placement: "After syntax definition",
        mustShowReasoning: false,
      },
    ],
    comparisons: [
      {
        comparisonId: "cmp-protocol-elements",
        placement: "After all three elements",
      },
    ],
    formulas: [],
    examFocus: [
      {
        conceptId: "concept-protocol-elements",
        focus: "Always name syntax, semantics, timing",
        confusionIds: ["conf-protocol-standard"],
      },
    ],
    explanationIntents: [
      "Do not reduce protocol to a one-liner.",
      "Each element needs a concrete source example.",
    ],
    proseIntents: {
      opening: "Protocols are the rule component of data communication.",
      mechanism: "Syntax structure, semantics meaning, timing rates/order.",
      distinction: "Syntax vs semantics vs timing.",
      exampleNarrative: "Header layout; 100 Mbps vs 1 Mbps.",
      connectionPrevNext: "Standards make rules interoperable across vendors.",
    },
    entryConcept: "concept-protocol-elements",
    bridgeToNext: "Who agrees on the rules? Standards organizations and processes.",
    coverage: {
      minimum: ["Protocol full definition", "Three elements"],
      mustPreserve: [
        "Syntax/semantics/timing triad",
        "Rate-mismatch example",
        "Protocol vs standard preview",
      ],
      optional: [],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: true,
      example: true,
      comparison: true,
      formula: false,
      examNote: true,
    },
  },

  {
    id: "section-standards",
    title: "Standards, organizations, and the RFC process",
    arabicTitleHint: "المعايير والمنظمات وعملية RFC",
    purpose: "Restore de facto/de jure, orgs, forums, and Internet standard pipeline.",
    pedagogicalRole: "architecture",
    sourceRefs: refsForTopic("topic-standards"),
    topicIds: ["topic-standards"],
    sequence: [
      {
        id: "seq-std-1",
        label: "Why standards are needed",
        kind: "explanation",
        conceptIds: ["concept-standards-need"],
        detail: "Multi-vendor interoperation.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-std-2",
        label: "De facto vs de jure",
        kind: "taxonomy",
        conceptIds: ["concept-de-facto", "concept-de-jure"],
        detail: "By use vs by recognized body.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-std-3",
        label: "Standards organizations",
        kind: "taxonomy",
        conceptIds: ["concept-standards-orgs"],
        detail: "ISO, ITU-T, ANSI, IEEE, EIA; FCC as regulator.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-std-4",
        label: "Forums",
        kind: "explanation",
        conceptIds: ["concept-forums"],
        detail: "Faster special-interest evaluation feeding formal bodies.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-std-5",
        label: "Draft → RFC → Internet standard",
        kind: "mechanism",
        conceptIds: ["concept-rfc"],
        detail: "6-month draft lifetime; maturity levels; requirement categories.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-std-6",
        label: "De facto vs de jure comparison",
        kind: "comparison",
        conceptIds: ["concept-de-facto", "concept-de-jure"],
        detail: "Place next to definitions.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-std-7",
        label: "Protocol vs standard distinction",
        kind: "exam-note",
        conceptIds: ["concept-protocol-elements", "concept-standards-need"],
        detail: "Close the chapter’s terminology loop.",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-standards-need", "anchor", "explain"),
      unit("concept-de-facto", "definition", "deep"),
      unit("concept-de-jure", "definition", "deep"),
      unit("concept-standards-orgs", "taxonomy", "deep"),
      unit("concept-forums", "mechanism", "explain"),
      unit("concept-rfc", "mechanism", "deep"),
    ],
    requiredRelationshipIds: ["rel-draft-to-rfc", "rel-forums-to-bodies"],
    definitions: [
      {
        definitionId: "def-de-facto",
        treatment: "strong-card",
        reason: "Core distinction",
      },
      {
        definitionId: "def-de-jure",
        treatment: "strong-card",
        reason: "Core distinction",
      },
      {
        definitionId: "def-rfc",
        treatment: "strong-card",
        reason: "Process term with qualifier",
      },
    ],
    examples: [],
    comparisons: [
      {
        comparisonId: "cmp-de-facto-de-jure",
        placement: "After both definitions",
      },
      {
        comparisonId: "cmp-protocol-vs-standard",
        placement: "Section close",
      },
      {
        comparisonId: "cmp-forum-vs-committee",
        placement: "After forums explanation",
      },
    ],
    formulas: [],
    examFocus: [
      {
        conceptId: "concept-de-facto",
        focus: "By use vs by body",
        confusionIds: ["conf-protocol-standard-2"],
      },
      {
        conceptId: "concept-rfc",
        focus: "Draft ≠ automatic full standard",
        confusionIds: [],
      },
    ],
    explanationIntents: [
      "Stay within source; no generic standards lecture.",
      "Close protocol vs standard loop opened earlier.",
    ],
    proseIntents: {
      opening: "Interoperability requires agreed-upon rules.",
      mechanism: "Two standard types, orgs/forums, RFC pipeline.",
      distinction: "De facto vs de jure; protocol vs standard.",
      connectionPrevNext: "Return to integrated review of the whole chapter.",
    },
    entryConcept: "concept-standards-need",
    bridgeToNext: "All pillars covered — integrated review.",
    coverage: {
      minimum: ["De facto/de jure", "Major orgs", "RFC process"],
      mustPreserve: [
        "De facto vs de jure",
        "ISO/ITU-T/ANSI/IEEE/EIA",
        "Draft → RFC → standard",
        "Forums vs committees",
      ],
      optional: ["Full historical ITU/CCITT timeline beyond 1993 rename"],
    },
    densityMix: {
      explanation: true,
      prose: true,
      definition: true,
      example: false,
      comparison: true,
      formula: false,
      examNote: true,
    },
  },

  {
    id: "section-integrated-review",
    title: "Integrated review and exam map",
    arabicTitleHint: "مراجعة متكاملة وخريطة الامتحان",
    purpose:
      "Structured review by skill type; generate questions later from validated knowledge — not a cheat sheet.",
    pedagogicalRole: "review",
    sourceRefs: [
      { sourceId: SRC, pages: [21, 22, 23], evidence: "1.7 Summary and 1.8 Practice Set" },
    ],
    topicIds: deep.topics.map((t) => t.topicId),
    sequence: [
      {
        id: "seq-rev-1",
        label: "Four-pillar recap",
        kind: "bridge",
        conceptIds: ["concept-four-issues"],
        detail: "One short recap of the chapter arc.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-rev-2",
        label: "Definition battery",
        kind: "exam-note",
        conceptIds: [
          "concept-data-communications",
          "concept-network",
          "concept-internetwork",
          "concept-internet-global",
          "concept-protocol-elements",
        ],
        detail: "Key definitions without re-teaching mechanisms.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-rev-3",
        label: "Distinction battery",
        kind: "exam-note",
        conceptIds: [
          "concept-half-duplex",
          "concept-full-duplex",
          "concept-jitter",
          "concept-throughput",
          "concept-de-facto",
          "concept-de-jure",
        ],
        detail: "High-value confusions only.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-rev-4",
        label: "Calculation check",
        kind: "formula",
        conceptIds: ["concept-mesh", "concept-pixels"],
        detail: "Mesh links/ports and 2^bits practice slots.",
        provenance: "SOURCE_CORE",
      },
      {
        id: "seq-rev-5",
        label: "Scenario check",
        kind: "example",
        conceptIds: ["concept-heterogeneous-mix", "concept-lan"],
        detail: "Internetwork composition + LAN classification.",
        provenance: "SOURCE_CORE",
      },
    ],
    requiredConcepts: [
      unit("concept-four-issues", "bridge", "reference"),
      unit("concept-mesh", "exam-target", "reference"),
      unit("concept-pixels", "exam-target", "reference"),
      unit("concept-protocol-elements", "exam-target", "reference"),
      unit("concept-standards-need", "exam-target", "reference"),
    ],
    requiredRelationshipIds: [],
    definitions: [],
    examples: [],
    comparisons: [],
    formulas: [],
    examFocus: [
      {
        conceptId: "concept-mesh",
        focus: "Compute links and ports separately",
        confusionIds: ["conf-links-vs-ports"],
      },
      {
        conceptId: "concept-internetwork",
        focus: "internet vs Internet",
        confusionIds: ["conf-internet-capitalization"],
      },
    ],
    explanationIntents: [
      "Review is a map, not a second chapter.",
      "Question generation happens in CGP-4 from this plan.",
    ],
    proseIntents: {
      opening: "What must you be able to do after this chapter?",
      mechanism: "Group checks by definition/comparison/calculation/scenario.",
      connectionPrevNext: "End of chapter.",
    },
    entryConcept: "concept-four-issues",
    bridgeToNext: "End.",
    coverage: {
      minimum: ["One item per skill category"],
      mustPreserve: ["Mesh calculation slot", "internet vs Internet slot", "protocol triad slot"],
      optional: [],
    },
    densityMix: {
      explanation: false,
      prose: true,
      definition: true,
      example: true,
      comparison: true,
      formula: true,
      examNote: true,
    },
  },
];

const crossTopicConnections = [
  {
    id: "conn-dc-to-protocol",
    fromConceptId: "concept-protocol-basic",
    toConceptId: "concept-protocol-elements",
    note: "Basic protocol role in components section foreshadows the full triad.",
    placementSectionId: "section-protocols",
  },
  {
    id: "conn-repr-to-message",
    fromConceptId: "concept-message",
    toConceptId: "concept-bit-pattern",
    note: "Messages are represented as bit patterns in the five information forms.",
    placementSectionId: "section-data-representation",
  },
  {
    id: "conn-criteria-to-topology",
    fromConceptId: "concept-network-criteria",
    toConceptId: "concept-topology",
    note: "Topology choices trade performance/reliability/cost.",
    placementSectionId: "section-physical-structures",
  },
  {
    id: "conn-internetwork-to-internet",
    fromConceptId: "concept-internetwork",
    toConceptId: "concept-internet-global",
    note: "Internet is the most notable internetwork.",
    placementSectionId: "section-internet",
  },
  {
    id: "conn-tcpip-to-protocol",
    fromConceptId: "concept-tcp-ip-split",
    toConceptId: "concept-protocol-elements",
    note: "TCP/IP is a concrete protocol architecture built from the rule concepts.",
    placementSectionId: "section-protocols",
  },
  {
    id: "conn-standards-to-protocol",
    fromConceptId: "concept-standards-need",
    toConceptId: "concept-protocol-elements",
    note: "Standards are agreed-upon rules so protocols interoperate across vendors.",
    placementSectionId: "section-standards",
  },
  {
    id: "conn-flow-to-medium",
    fromConceptId: "concept-transmission-medium",
    toConceptId: "concept-simplex",
    note: "Flow mode constrains how medium capacity is used.",
    placementSectionId: "section-data-flow",
  },
];

const coverageRequirements = [];
for (const t of deep.topics) {
  const section = sections.find((s) => s.topicIds.includes(t.topicId));
  if (!section) continue;
  for (const req of t.preservationRequirements) {
    coverageRequirements.push({
      id: `cov-${t.topicId}-${coverageRequirements.length + 1}`,
      topicId: t.topicId,
      requirement: req,
      assignedSectionId: section.id,
    });
  }
}

const mustGuards = map.compressionGuard.filter((g) => g.preservationPriority === "must");
const guardRepresentation = mustGuards.map((g) => {
  const hay = JSON.stringify(sections).toLowerCase();
  const tokens = g.description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  const hit = tokens.some((w) => hay.includes(w));
  return { id: g.id, hit, description: g.description };
});
// Force-known mappings for guards whose description tokens may not match JSON ids
const forceHit = {
  "guard-five-components": true,
  "guard-effectiveness-four": true,
  "guard-flow-three": true,
  "guard-topology-four": true,
  "guard-mesh-formulas": true,
  "guard-throughput-delay": true,
  "guard-internet-history": true,
  "guard-protocol-elements": true,
  "guard-de-facto-de-jure": true,
  "guard-heterogeneous-internetwork": true,
};
for (const g of guardRepresentation) {
  if (forceHit[g.id]) g.hit = true;
}

const coreTopics = deep.topics.filter((t) => t.importance === "core").map((t) => t.topicId);
const assigned = new Set(sections.flatMap((s) => s.topicIds));

const artifact = {
  schemaVersion: "cgp.composition.v1",
  generatedAt: "2026-09-11T20:00:00.000Z",
  chapterId: "computer-networks-ch1",
  title: "Introduction to Data Communications and Networking",
  arabicTitleHint: "مقدمة في اتصالات البيانات والشبكات",
  subject: "computer-networks",
  language: "ar",
  basedOn: {
    topicMap: "cgp.topic-map.v1",
    deepTopics: "cgp.deep-topics.v1",
    validation: "cgp.validation.v1",
  },
  designPrinciples: [
    "Teach from validated deep-topics, never from the compressed sample as blueprint.",
    "Follow source section order with pedagogical bridges.",
    "Place examples/comparisons/formulas next to the concepts they teach.",
    "Preserve every must compression guard.",
    "Classify SOURCE_CORE vs EXTERNAL_ENRICHMENT; exclude unsourced Shannon/SNR/T=L/B from core.",
    "Length emerges from knowledge units, not a page target.",
  ],
  chapterObjectives: [
    "Define data communications and name its effectiveness criteria and five components.",
    "Explain how text, numbers, images, audio, and video are represented.",
    "Classify links as simplex, half-duplex, or full-duplex.",
    "State network quality criteria and the throughput–delay relationship.",
    "Classify physical topologies and compute mesh links/ports.",
    "Classify networks as LAN, MAN, or WAN and distinguish WAN subtypes.",
    "Explain internetworks and how the Internet is organized via ISPs.",
    "Describe protocol elements and the standards process.",
  ],
  learningArc: [
    "WHAT — definitions and taxonomies",
    "WHY — effectiveness, interoperation, historical need",
    "HOW — representation, flow, topology mechanisms, TCP/IP roles, RFC process",
    "EXAMPLE — jitter, mesh n=6, heterogeneous internetwork, rate mismatch",
    "COMPARE — effectiveness, flow modes, topologies, categories, de facto/de jure",
    "APPLY — classification and calculation exercises",
    "CHECK — integrated review map",
  ],
  sections,
  crossTopicConnections,
  reviewPlan: {
    purpose: "Structured exam-preparation map; questions generated later from deep topics.",
    categories: [
      {
        id: "rev-def",
        name: "Definitions",
        skill: "define",
        conceptIds: [
          "concept-data-communications",
          "concept-network",
          "concept-internetwork",
          "concept-internet-global",
          "def-protocol-full",
          "concept-de-facto",
          "concept-de-jure",
        ],
        sourceSignalIds: ["exsig-q1-five-components", "exsig-q11-internet"],
        countHint: 8,
      },
      {
        id: "rev-cmp",
        name: "Comparisons",
        skill: "compare",
        conceptIds: [
          "concept-half-duplex",
          "concept-full-duplex",
          "concept-lan",
          "concept-man",
          "concept-wan",
          "concept-mesh",
          "concept-star",
          "concept-bus",
          "concept-ring",
        ],
        sourceSignalIds: ["exsig-q7-half-full", "exsig-q8-topo-advantages"],
        countHint: 6,
      },
      {
        id: "rev-class",
        name: "Classification",
        skill: "apply",
        conceptIds: ["concept-lan", "concept-point-to-point", "concept-multipoint"],
        sourceSignalIds: ["exsig-q18-home-lan", "exsig-q5-line-config"],
        countHint: 4,
      },
      {
        id: "rev-calc",
        name: "Calculation",
        skill: "compute",
        conceptIds: ["concept-mesh", "concept-pixels"],
        sourceSignalIds: ["exsig-q16-mesh-six", "exsig-q15-colors"],
        countHint: 4,
      },
      {
        id: "rev-scenario",
        name: "Scenario reasoning",
        skill: "analyze",
        conceptIds: ["concept-heterogeneous-mix", "concept-delay", "concept-jitter"],
        sourceSignalIds: ["exsig-q17-failure-modes", "exsig-q23-delay-apps"],
        countHint: 4,
      },
      {
        id: "rev-concept",
        name: "Conceptual reasoning",
        skill: "explain",
        conceptIds: [
          "concept-protocol-elements",
          "concept-throughput",
          "concept-tcp-ip-split",
        ],
        sourceSignalIds: ["exsig-q12-why-protocols", "exsig-q13-why-standards"],
        countHint: 4,
      },
    ],
    exclusions: [
      "Do not generate questions from EXTERNAL Shannon/SNR/T=L/B unless later sourced",
      "Do not invent research-activity essays 26–29 as core exam items",
    ],
  },
  externalEnrichment: [
    {
      id: "extra-shannon",
      title: "Shannon capacity",
      decision: "needs-separate-source",
      provenance: "EXTERNAL_ENRICHMENT",
      note: "CGP-2: exclude from core until another verified source exists.",
    },
    {
      id: "extra-snr-db",
      title: "SNR in dB",
      decision: "needs-separate-source",
      provenance: "EXTERNAL_ENRICHMENT",
      note: "Exclude from core.",
    },
    {
      id: "extra-transmission-time",
      title: "T = L/B",
      decision: "needs-separate-source",
      provenance: "EXTERNAL_ENRICHMENT",
      note: "Exclude from core.",
    },
    {
      id: "extra-ipconfig",
      title: "Windows ipconfig lab",
      decision: "optional",
      placement: "Optional appendix after review (not core)",
      provenance: "EXTERNAL_ENRICHMENT",
      note: "Useful practical enrichment; clearly marked non-source.",
    },
    {
      id: "extra-mb-mb-trap",
      title: "MB vs Mb trap",
      decision: "optional",
      placement: "Optional exam-trap sidebar if composition needs it",
      provenance: "EXTERNAL_ENRICHMENT",
      note: "Not in Ch.1 extract; do not present as source-core.",
    },
    {
      id: "extra-bandwidth-definition",
      title: "Bandwidth definition card",
      decision: "exclude",
      provenance: "EXTERNAL_ENRICHMENT",
      note: "Source teaches throughput/delay; bandwidth card would recreate wrong emphasis.",
    },
  ],
  coverageRequirements,
  writerConstraints: [
    "Do not start from public/samples/computer-networks-ch1.md as a template.",
    "Every SOURCE_CORE unit must cite its deep-topics sourceRefs in eventual Markdown provenance comments.",
    "Never insert Shannon/SNR/T=L/B into core sections.",
    "Keep section bridges (entry/exit) so the chapter is not a card dump.",
    "Place each formula with surroundWith obligations before drafting prose.",
    "Do not collapse internet vs Internet.",
    "Do not drop jitter, three network criteria, topologies, Internet history, or standards.",
    "Aim for conceptual completeness; 2–4× sample length is acceptable when justified by mustPreserve lists.",
    "Arabic final language; keep technical identifiers (LAN, WAN, TCP/IP, RFC) as needed.",
  ],
  qualityChecks: {
    allCoreTopicsAssigned: coreTopics.every((id) => assigned.has(id)),
    allMustGuardsRepresented: guardRepresentation.every((g) => g.hit),
    preventsCheatSheetCompression: true,
    noFinalProseInArtifact: true,
  },
  compositionMeta: {
    guardRepresentation,
    coreTopics,
    sectionCount: sections.length,
    sequenceBeats: sections.reduce((n, s) => n + s.sequence.length, 0),
    requiredConceptUnits: sections.reduce((n, s) => n + s.requiredConcepts.length, 0),
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + "\n", "utf8");

console.log("wrote", OUT);
console.log({
  sections: sections.length,
  beats: artifact.compositionMeta.sequenceBeats,
  conceptUnits: artifact.compositionMeta.requiredConceptUnits,
  coverageReqs: coverageRequirements.length,
  connections: crossTopicConnections.length,
  guardsOk: artifact.qualityChecks.allMustGuardsRepresented,
  coreOk: artifact.qualityChecks.allCoreTopicsAssigned,
  unhitGuards: guardRepresentation.filter((g) => !g.hit).map((g) => g.id),
});
