import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnnotationDecisionInsights,
  summarizeAnnotations,
} from "./annotationReportInsights";

test("resume anotaciones y propone una lectura formativa", () => {
  const summary = summarizeAnnotations([
    { dateTime: "2026-04-10T12:00:00Z", type: "Negativa", severity: "Grave" },
    { dateTime: "2026-04-10T12:00:00Z", type: "Negativa", severity: "Grave" },
    { dateTime: "2026-05-10T12:00:00Z", type: "Positiva", severity: "Leve" },
  ]);

  assert.deepEqual(summary, {
    total: 3,
    negative: 2,
    positive: 1,
    informational: 0,
    peakMonth: "2026-04",
    peakMonthTotal: 2,
  });
  assert.match(
    buildAnnotationDecisionInsights(summary)[0]?.action ?? "",
    /acciones de aula/i,
  );
});

test("orienta seguimiento cuando hay apoyos pendientes", () => {
  const insights = buildAnnotationDecisionInsights(
    {
      total: 1,
      negative: 1,
      positive: 0,
      informational: 0,
      peakMonth: "2026-04",
      peakMonthTotal: 1,
    },
    {
      sinCarta: { total: 1, pending: 1, processed: 0, archived: 0 },
      amonestacion: { total: 0, pending: 0, processed: 0, archived: 0 },
      compromiso: { total: 0, pending: 0, processed: 0, archived: 0 },
      derivacion: { total: 0, pending: 0, processed: 0, archived: 0 },
    },
  );

  const pendingInsight = insights.find((insight) =>
    /apoyos/i.test(insight.title),
  );
  assert.equal(pendingInsight?.priority, "Alta");
});
