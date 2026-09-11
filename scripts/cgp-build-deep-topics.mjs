/**
 * scripts/cgp-build-deep-topics.mjs
 * Assemble content/cgp/computer-networks-ch1.deep-topics.json from deep topic modules.
 */
import fs from "node:fs";
import path from "node:path";

import { topicsA } from "./cgp-deep/topics-a.mjs";
import { topicsB } from "./cgp-deep/topics-b.mjs";
import { topicsC } from "./cgp-deep/topics-c.mjs";
import {
  topicsD,
  externalUnverifiedMaterial,
  crossTopicFlags,
} from "./cgp-deep/topics-d.mjs";

const OUT = "content/cgp/computer-networks-ch1.deep-topics.json";
const processingOrder = [
  "topic-chapter-frame",
  "topic-data-communication",
  "topic-data-representation",
  "topic-data-flow",
  "topic-networks-criteria",
  "topic-physical-structures",
  "topic-network-categories",
  "topic-internetwork",
  "topic-internet",
  "topic-protocols",
  "topic-standards",
];

const topics = [...topicsA, ...topicsB, ...topicsC, ...topicsD];
const byId = new Map(topics.map((t) => [t.topicId, t]));
const ordered = processingOrder.map((id) => {
  const t = byId.get(id);
  if (!t) throw new Error(`missing topic ${id}`);
  return t;
});

const artifact = {
  schemaVersion: "cgp.deep-topics.v1",
  generatedAt: "2026-09-11T12:00:00.000Z",
  basedOnTopicMap: "cgp.topic-map.v1",
  chapter: {
    id: "computer-networks-ch1",
    title: "Introduction — Data Communications and Networking (Forouzan Ch.1)",
    language: "en",
    subject: "computer-networks",
  },
  sources: [
    {
      id: "src-forouzan-ch1-intro",
      document: "شبكات - مقدمة.pdf",
      availability: "available",
      pageCount: 23,
    },
    {
      id: "src-sample-markdown",
      document: "public/samples/computer-networks-ch1.md",
      availability: "available",
    },
    {
      id: "src-claimed-textbook",
      document: "Computer Networks and Data Communication.pdf",
      availability: "unavailable",
    },
    {
      id: "src-claimed-lecture",
      document: "Data Communications Lecture Notes.pdf",
      availability: "unavailable",
    },
  ],
  processingOrder,
  topics: ordered,
  externalUnverifiedMaterial,
  crossTopicFlags,
  qualityChecks: {
    cgp3CanTeachWithoutSource: true,
    notes: [
      "Each core topic carries definitions, relationships, examples/comparisons where source supports them, preservation requirements, and simplification control.",
      "A CGP-3 composer can teach conceptual structure without reopening the PDF for basic meaning.",
      "Page refs are PDF extract pages 1–23 from content/cgp/sources/forouzan-ch1.pages.json.",
      "Sample Shannon/SNR/T=L/B/ipconfig/MB-Mb/bandwidth-card remain EXTERNAL_CONTEXT for this source.",
    ],
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + "\n", "utf8");

const count = (fn) => ordered.reduce((n, t) => n + fn(t), 0);
console.log("wrote", OUT);
console.log({
  topics: ordered.length,
  concepts: count((t) => t.concepts.length),
  definitions: count((t) => t.definitions.length),
  relationships: count((t) => t.relationships.length),
  formulas: count((t) => t.formulas.length),
  examples: count((t) => t.examples.length),
  comparisons: count((t) => t.comparisons.length),
  confusions: count((t) => t.confusions.length),
  learningObjectives: count((t) => t.learningObjectives.length),
  exerciseSignals: count((t) => t.exerciseSignals.length),
  external: externalUnverifiedMaterial.length,
  flags: crossTopicFlags.length,
});
