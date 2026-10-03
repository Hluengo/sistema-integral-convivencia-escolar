/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { EstadoCausa, type Causa } from "../../shared/lib/types";
import { getCausaDeadline, getCausaDeadlineStages } from "./causaPresentation";

const featureDir = dirname(fileURLToPath(import.meta.url));
const read = (relativePath: string) =>
  readFileSync(resolve(featureDir, relativePath), "utf-8");

const cause = (overrides: Partial<Causa> = {}): Causa => ({
  id: "DC-2026-014",
  estudianteNombre: "Nombre completo",
  estudianteCurso: "7° Básico A",
  nnaProtectedName: "N. C.",
  runEstudiante: "12.345.678-9",
  fechaApertura: "2026-07-01",
  estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
  tipoInfraccion: "Grave",
  responsable: "Responsable",
  comprometeAulaSegura: false,
  fechaUltimaActualizacion: "2026-07-01",
  observaciones: "Resumen",
  bitacora: [],
  checklistDebidoProceso: [],
  ...overrides,
});

const cierreIndagacion = (
  fechaCompletado: string,
): Causa["checklistDebidoProceso"][number] => ({
  id: "chk_res_2",
  label: "Informe Cierre de Indagación Emitido",
  descripcion: "",
  completado: true,
  fechaCompletado,
  requeridoPor: "Reglamento Interno",
});

const informeConcluyente = (
  fechaCompletado: string,
): Causa["checklistDebidoProceso"][number] => ({
  id: "chk_res_6",
  label: "Informe Concluyente Emitido",
  descripcion: "",
  completado: true,
  fechaCompletado,
  requeridoPor: "Reglamento Interno",
});

describe("Listado de causas activas", () => {
  it("mantiene el orden búsqueda/filtros, fases y tabla", () => {
    const view = read("MainContent/CausasView.tsx");
    const searchPosition = view.indexOf('id="search-active-causes"');
    const coursePosition = view.indexOf('id="active-causes-course-filter"');
    const phasePosition = view.indexOf('aria-label="Filtro por fase"');
    const tablePosition = view.indexOf("<CausasTable");

    assert.ok(searchPosition > 0);
    assert.ok(coursePosition > searchPosition);
    assert.ok(phasePosition > coursePosition);
    assert.ok(tablePosition > phasePosition);
  });

  it("incluye las columnas esenciales, privacidad y acción de gestión", () => {
    const table = read("CausasTable.tsx");
    for (const heading of [
      "Estudiante",
      "Curso",
      "Expediente",
      "Tipificación",
      "Fase actual",
      "Días para cierre",
      "Estado",
      "Acción",
    ]) {
      assert.match(table, new RegExp(heading));
    }
    assert.match(
      table,
      /privacyMode \? causa\.nnaProtectedName : causa\.estudianteNombre/,
    );
    assert.match(table, /!privacyMode && causa\.runEstudiante/);
    assert.match(table, /onSelectCausa\(causa\)/);
    assert.match(table, /Gestionar expediente/);
  });

  it("abre un modal accesible, mueve el trabajo de fases a la ruta y centraliza el asistente legal", () => {
    const view = read("MainContent/CausasView.tsx");
    const modal = read("CausaDetailModal.tsx");
    const tabs = read("../timeline/TimelineTabs.tsx");
    const summary = read("../timeline/ResumenTab.tsx");
    const panels = read("../timeline/TimelineTabPanels.tsx");
    const routeYolo = read("../timeline/RutaYoloView.tsx");
    const advisor = read("MainContent/AdvisorView.tsx");
    const operationalSummary = read("causaOperationalSummary.ts");

    assert.match(view, /<CausaDetailModal/);
    assert.match(modal, /<Dialog\s+open=/);
    assert.match(modal, /onOpenChange/);
    assert.match(modal, /<DetailModalContent/);
    assert.match(tabs, /Resumen/);
    assert.match(tabs, /Ruta del expediente/);
    assert.match(tabs, /Historial/);
    assert.doesNotMatch(tabs, /Asistente legal/);
    assert.match(advisor, /Consulta legal/);
    assert.doesNotMatch(advisor, /Redacción documentos/);
    assert.doesNotMatch(advisor, /Plantillas/);
    assert.doesNotMatch(advisor, /Auditoría legal/);
    assert.doesNotMatch(advisor, /legal-case-selector/);
    assert.doesNotMatch(tabs, /Recepción/);
    for (const phase of [
      "Recepción",
      "Investigación",
      "Resolución",
      "Apelación",
      "Seguimiento",
    ]) {
      assert.match(operationalSummary, new RegExp(phase));
    }
    assert.doesNotMatch(summary, /Ruta del expediente/);
    assert.match(panels, /activeTab === ["']ruta["']/);
    assert.match(panels, /<RutaYoloView/);
    assert.match(routeYolo, /onSelectPhase/);
    assert.match(routeYolo, /Visor documental del hito/);
  });

  it("calcula días civiles usando la fecha chilena incluso cerca de UTC", () => {
    const deadline = getCausaDeadline(
      cause({ fechaApertura: "2026-07-01", plazoInvestigacionDias: 60 }),
      new Date("2026-07-30T02:30:00.000Z"),
    );
    assert.equal(deadline.remainingDays, 31);
    assert.equal(deadline.text, "31 días");
  });

  it("acota plazos guardados con la regla anterior a 60 días corridos", () => {
    const deadline = getCausaDeadline(
      cause({
        fechaApertura: "2026-07-01",
        fechaLimiteInvestigacion: "2026-09-23",
      }),
      new Date("2026-07-30T12:00:00.000Z"),
    );
    assert.equal(deadline.deadlineDate, "2026-08-30");
    assert.equal(deadline.text, "31 días");
  });

  it("respeta plazos personalizados más breves que el tope", () => {
    const deadline = getCausaDeadline(
      cause({
        fechaApertura: "2026-07-01",
        fechaLimiteInvestigacion: "2026-07-20",
      }),
      new Date("2026-07-30T12:00:00.000Z"),
    );
    assert.equal(deadline.deadlineDate, "2026-07-20");
    assert.equal(deadline.text, "Plazo excedido");
  });

  it("distingue plazo próximo y plazo excedido", () => {
    const warning = getCausaDeadline(
      cause({ fechaApertura: "2026-07-01", plazoInvestigacionDias: 30 }),
      new Date("2026-07-27T12:00:00.000Z"),
    );
    const overdue = getCausaDeadline(
      cause({ fechaApertura: "2026-07-01", plazoInvestigacionDias: 10 }),
      new Date("2026-07-20T12:00:00.000Z"),
    );
    assert.equal(warning.tone, "warning");
    assert.equal(overdue.text, "Plazo excedido");
  });

  it("cuenta faltas Muy Graves y Gravísimas con 10 días aunque tengan plazo heredado de 60", () => {
    const deadline = getCausaDeadline(
      cause({
        fechaApertura: "2026-07-01",
        tipoInfraccion: "Muy Grave",
        plazoInvestigacionDias: 60,
        fechaLimiteInvestigacion: "2026-09-22",
      }),
      new Date("2026-07-20T12:00:00.000Z"),
    );
    assert.equal(deadline.text, "Plazo excedido");
  });

  it("presenta el plazo de alta complejidad en días hábiles", () => {
    const deadline = getCausaDeadline(
      cause({ fechaApertura: "2026-08-27", tipoInfraccion: "Gravísima" }),
      new Date("2026-09-04T12:00:00.000Z"),
    );
    assert.equal(deadline.remainingDays, 4);
    assert.equal(deadline.text, "4 días");
    assert.equal(deadline.deadlineDate, "2026-09-10");
  });

  it("usa el hito de cierre para evaluar si la indagación quedó excedida", () => {
    const enPlazo = getCausaDeadline(
      cause({
        fechaApertura: "2026-08-13",
        fechaInicioInvestigacion: "2026-08-13",
        tipoInfraccion: "Gravísima",
        checklistDebidoProceso: [cierreIndagacion("2026-08-26")],
      }),
      new Date("2026-09-03T12:00:00.000Z"),
    );
    const fueraPlazo = getCausaDeadline(
      cause({
        fechaApertura: "2026-08-13",
        fechaInicioInvestigacion: "2026-08-13",
        tipoInfraccion: "Gravísima",
        checklistDebidoProceso: [cierreIndagacion("2026-08-28")],
      }),
      new Date("2026-09-03T12:00:00.000Z"),
    );

    assert.equal(enPlazo.text, "Cerró en plazo");
    assert.equal(enPlazo.tone, "normal");
    assert.equal(fueraPlazo.text, "Cerró fuera de plazo");
    assert.equal(fueraPlazo.tone, "overdue");
  });

  it("distingue cierre a 10 días e informe concluyente a 15 días totales", () => {
    const deadlines = getCausaDeadlineStages(
      cause({
        fechaApertura: "2026-08-13",
        fechaInicioInvestigacion: "2026-08-13",
        tipoInfraccion: "Gravísima",
        checklistDebidoProceso: [
          cierreIndagacion("2026-08-26"),
          informeConcluyente("2026-09-03"),
        ],
      }),
      new Date("2026-09-03T12:00:00.000Z"),
    );

    assert.equal(deadlines.cierreIndagacion.text, "Cerró en plazo");
    assert.equal(deadlines.informeConcluyente?.text, "Cerró fuera de plazo");
  });

  it("usa el hito de inicio de indagación para no adelantar el plazo", () => {
    const deadlines = getCausaDeadlineStages(
      cause({
        fechaApertura: "2026-08-13",
        fechaInicioInvestigacion: "2026-08-13",
        tipoInfraccion: "Gravísima",
        checklistDebidoProceso: [
          {
            id: "chk_rec_3",
            label: "Notificación de Inicio de Indagación",
            descripcion: "",
            completado: true,
            fechaCompletado: "2026-08-14",
            requeridoPor: "Circular 482",
          },
          cierreIndagacion("2026-08-27"),
          informeConcluyente("2026-09-03"),
        ],
      }),
      new Date("2026-09-03T12:00:00.000Z"),
    );

    assert.equal(deadlines.cierreIndagacion.text, "Cerró en plazo");
    assert.equal(deadlines.informeConcluyente?.text, "Cerró en plazo");
  });

  it("mantiene la bitácora y checklist como fuentes del detalle", () => {
    const panels = read("../timeline/TimelineTabPanels.tsx");
    const checklistRegistration = read(
      "../../shared/lib/hooks/useChecklistRegistration.ts",
    );
    assert.match(panels, /<BitacoraTab/);
    assert.doesNotMatch(checklistRegistration, /recepcion: true/);
    assert.doesNotMatch(checklistRegistration, /investigacion: true/);
  });

  it("presenta el resumen como centro operativo del expediente", () => {
    const summary = read("../timeline/ResumenTab.tsx");
    const tabs = read("../timeline/TimelineTabs.tsx");

    assert.match(summary, /Centro operativo del expediente/);
    assert.match(summary, /Avance de fase/);
    assert.match(summary, /Fase completada · lista para avanzar/);
    assert.match(summary, /Próximo hito ·/);
    assert.match(summary, /\(fase \$\{summary\.nextChecklistPhase\}\)/);
    assert.match(summary, /Plazo de investigación/);
    assert.match(summary, /días \{unidadPlazo\}/);
    assert.match(summary, /Relato de los hechos · ver completo/);
    assert.match(summary, /registros/);
    assert.doesNotMatch(summary, /Sin alertas/);
    assert.doesNotMatch(summary, /Cierre de indagación/);
    assert.doesNotMatch(summary, /Trazabilidad/);
    assert.doesNotMatch(summary, /Estado actual/);
    assert.match(summary, /nextChecklistItem/);
    assert.match(summary, /documentsCount/);
    assert.match(tabs, /getCausaOperationalSummary/);
    assert.match(tabs, /summary\.currentPhase/);
  });

  it("alinea el historial de causas con el registro manual y las tarjetas de anotaciones", () => {
    const causesHistory = read("../timeline/BitacoraTab.tsx");
    const annotationHistoryForm = read(
      "../anotaciones/AnotacionesStudentDetailModal/ManualHistoryEntryForm.tsx",
    );
    const sharedHistoryForm = read("../../shared/ui/HistoryEntryForm.tsx");

    assert.match(causesHistory, /HistoryEntryForm/);
    assert.match(causesHistory, /Detalles del registro/);
    assert.match(causesHistory, /FILTER_OPTIONS/);
    assert.match(causesHistory, /Buscar en comunicaciones/);
    assert.doesNotMatch(causesHistory, /Centro de comunicaciones/);
    assert.match(causesHistory, /NotebookPen/);
    assert.match(annotationHistoryForm, /HistoryEntryForm/);
    assert.match(sharedHistoryForm, /Nueva entrada en el historial/);
    assert.match(sharedHistoryForm, /Registrar entrada manual/);
  });

  it("no selecciona automáticamente la primera causa al cargar el listado", () => {
    const workspace = read("../../app/hooks/useCausaWorkspace.ts");
    assert.match(workspace, /setSelectedCausaId\(["']{2}\)/);
    assert.doesNotMatch(
      workspace,
      /setSelectedCausaId\(causasQuery\.data\[0\]/,
    );
  });

  it("no reinicia Zustand en bucle mientras la sesión aún no está autenticada", () => {
    const workspace = read("../../app/hooks/useCausaWorkspace.ts");

    assert.match(workspace, /if \(causas\.length > 0\) setCausas\(\[\]\);/);
    assert.match(
      workspace,
      /if \(selectedCausaId\) setSelectedCausaId\(["']{2}\);/,
    );
  });

  it("mantiene Plantillas como administración clara, con estados de acceso y sin recargas repetidas", () => {
    const templates = read("../document-templates/TemplateEditor.tsx");
    const templatesService = read(
      "../../shared/api/services/documentTemplates.service.ts",
    );

    assert.match(templates, /Plantillas institucionales/);
    assert.match(templates, /No hay plantillas institucionales disponibles/);
    assert.match(templates, /min-h-\[440px\]/);
    assert.match(templates, /selectedIdRef/);
    assert.match(templates, /useQuery/);
    assert.match(templates, /queryKey: \["document-templates", tenantId\]/);
    assert.match(templates, /TEMPLATE_ADMIN_ROLES/);
    assert.match(templates, /ACTIVE_TEMPLATE_DOC_TYPES/);
    assert.match(templates, /fetchAdminDocumentTemplates/);
    assert.match(templatesService, /solo para Dirección y Administración/);
    assert.match(templatesService, /updateDocumentTemplate/);
  });

  it("deja el membrete y los metadatos al formato de impresión, no al cuerpo generado", () => {
    const draftRoute = read("../../../server/api/routes/draft.ts");

    assert.match(draftRoute, /No los repitas en el cuerpo/);
    assert.match(draftRoute, /templatePrompt \|\| getTemplateFallback\(\)/);
  });
});
