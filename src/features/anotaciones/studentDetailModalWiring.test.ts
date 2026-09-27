/** @license SPDX-License-Identifier: Apache-2.0 */

import { ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const featureDir = import.meta.dirname!;
const read = (relativePath: string) =>
  readFileSync(resolve(featureDir, relativePath), "utf-8");

describe("Ficha disciplinaria: cableado del modal", () => {
  it("expone las cinco pestañas y las renderiza desde el modal principal", () => {
    const constants = read("AnotacionesStudentDetailModal/constants.tsx");
    const modal = read("AnotacionesStudentDetailModal.tsx");

    for (const tab of [
      "estado",
      "editar_anotaciones",
      "revisar_pdf",
      "cartas",
      "historial",
    ]) {
      ok(constants.includes(`"${tab}"`), `falta la pestaña ${tab}`);
      ok(modal.includes(`case "${tab}":`), `falta el render de ${tab}`);
    }

    ok(modal.includes("<DetailModalTabs"));
    ok(modal.includes("<DetailModalBody activeTabId={activeTab}"));
  });

  it("mantiene conectadas las acciones del resumen con sus pestañas", () => {
    const modal = read("AnotacionesStudentDetailModal.tsx");
    const summary = read("AnotacionesStudentDetailModal/StudentSummaryTab.tsx");

    ok(summary.includes("onGoToRevisionTab"));
    ok(summary.includes("Desglose de registros"));
    ok(summary.includes("Categorías detectadas en PDF"));
    ok(summary.includes("Docentes con más anotaciones"));
    ok(summary.includes("normalizeCategory"));
    ok(summary.includes("deduplicateDetectedAnnotations"));
    ok(modal.includes("annotations={effectiveAnnotations}"));
    ok(
      modal.includes(
        "detectedAnnotations={disciplinaryData.detectedAnnotations}",
      ),
    );
    ok(summary.includes("onGoToCartasTab"));
    ok(modal.includes('onGoToRevisionTab={() => setActiveTab("revisar_pdf")}'));
    ok(modal.includes('onGoToCartasTab={() => setActiveTab("cartas")}'));
  });

  it("refresca los datos después de confirmar revisión, editar anotaciones o cartas", () => {
    const modal = read("AnotacionesStudentDetailModal.tsx");
    const refreshCalls = modal.match(/disciplinaryData\.refresh\(\)/g) ?? [];

    ok(refreshCalls.length >= 3);
    ok(modal.includes("onConfirmed={async () =>"));
    ok(modal.includes("onSaved={async () =>"));
    ok(modal.includes("onRefresh={async () =>"));
    ok(modal.includes("onDataChanged?.()"));
  });
});
