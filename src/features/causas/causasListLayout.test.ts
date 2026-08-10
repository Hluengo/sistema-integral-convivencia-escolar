/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { EstadoCausa, type Causa } from '../../shared/lib/types';
import { getCausaDeadline } from './causaPresentation';

const featureDir = dirname(fileURLToPath(import.meta.url));
const read = (relativePath: string) => readFileSync(resolve(featureDir, relativePath), 'utf-8');

const cause = (overrides: Partial<Causa> = {}): Causa => ({
  id: 'DC-2026-014',
  estudianteNombre: 'Nombre completo',
  estudianteCurso: '7° Básico A',
  nnaProtectedName: 'N. C.',
  runEstudiante: '12.345.678-9',
  fechaApertura: '2026-07-01',
  estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
  tipoInfraccion: 'Grave',
  responsable: 'Responsable',
  comprometeAulaSegura: false,
  fechaUltimaActualizacion: '2026-07-01',
  observaciones: 'Resumen',
  bitacora: [],
  checklistDebidoProceso: [],
  ...overrides,
});

describe('Listado de causas activas', () => {
  it('mantiene el orden búsqueda/filtros, fases y tabla', () => {
    const view = read('MainContent/CausasView.tsx');
    const searchPosition = view.indexOf('id="search-active-causes"');
    const coursePosition = view.indexOf('id="active-causes-course-filter"');
    const phasePosition = view.indexOf('aria-label="Filtro por fase"');
    const tablePosition = view.indexOf('<CausasTable');

    assert.ok(searchPosition > 0);
    assert.ok(coursePosition > searchPosition);
    assert.ok(phasePosition > coursePosition);
    assert.ok(tablePosition > phasePosition);
  });

  it('incluye las columnas esenciales, privacidad y acción de gestión', () => {
    const table = read('CausasTable.tsx');
    for (const heading of [
      'Estudiante',
      'Curso',
      'Expediente',
      'Tipificación',
      'Fase actual',
      'Días para cierre',
      'Estado',
      'Acción',
    ]) {
      assert.match(table, new RegExp(heading));
    }
    assert.match(table, /privacyMode \? causa\.nnaProtectedName : causa\.estudianteNombre/);
    assert.match(table, /!privacyMode && causa\.runEstudiante/);
    assert.match(table, /onSelectCausa\(causa\)/);
    assert.match(table, /Gestionar expediente/);
  });

  it('abre un modal accesible, mueve el trabajo de fases a la ruta y centraliza el asistente legal', () => {
    const view = read('MainContent/CausasView.tsx');
    const modal = read('CausaDetailModal.tsx');
    const tabs = read('../timeline/TimelineTabs.tsx');
    const summary = read('../timeline/ResumenTab.tsx');
    const route = read('../timeline/RutaExpedienteTab.tsx');
    const panels = read('../timeline/TimelineTabPanels.tsx');
    const advisor = read('MainContent/AdvisorView.tsx');
    const operationalSummary = read('causaOperationalSummary.ts');
    const investigationChecklist = read('../timeline/InvestigationChecklist.tsx');

    assert.match(view, /<CausaDetailModal/);
    assert.match(modal, /<Dialog open=/);
    assert.match(modal, /onOpenChange/);
    assert.match(modal, /<DetailModalContent/);
    assert.match(tabs, /Resumen/);
    assert.match(tabs, /Ruta del expediente/);
    assert.match(tabs, /Historial/);
    assert.doesNotMatch(tabs, /Asistente legal/);
    assert.match(advisor, /Consulta legal/);
    assert.match(advisor, /Redacción documentos/);
    assert.match(advisor, /Plantillas/);
    assert.match(advisor, /Auditoría legal/);
    assert.match(advisor, /legal-case-selector/);
    assert.doesNotMatch(tabs, /Recepción/);
    for (const phase of ['Recepción', 'Investigación', 'Resolución', 'Apelación', 'Seguimiento']) {
      assert.match(operationalSummary, new RegExp(phase));
    }
    assert.doesNotMatch(summary, /Ruta del expediente/);
    assert.match(route, /onSelectPhase/);
    assert.match(route, /Trabajar.*hitos/);
    assert.match(route, /aria-controls="phase-workspace"/);
    assert.match(panels, /activeTab === 'ruta'/);
    assert.match(panels, /selectedPhase \? \(/);
    assert.match(panels, /Volver a la ruta/);
    assert.match(panels, /onSelectPhase\(null\)/);
    assert.match(panels, /<ProcesoTab/);
    assert.match(panels, /id="phase-workspace"/);
    assert.match(investigationChecklist, /Mediación no requerida/);
    assert.match(investigationChecklist, /Derivar a mediación/);
    assert.match(investigationChecklist, /handleStartRegister\(derivationItem\)/);
    assert.match(investigationChecklist, /model\.mediationActive &&/);
    assert.match(investigationChecklist, /notRequired={model\.mediationOutcome === 'agreement'}/);
    assert.match(investigationChecklist, /notRequired={model\.mediationOutcome === 'failed'}/);
  });

  it('calcula días civiles usando la fecha chilena incluso cerca de UTC', () => {
    const deadline = getCausaDeadline(
      cause({ fechaApertura: '2026-07-01', plazoInvestigacionDias: 60 }),
      new Date('2026-07-30T02:30:00.000Z'),
    );
    assert.equal(deadline.remainingDays, 31);
    assert.equal(deadline.text, '31 días');
  });

  it('distingue plazo próximo y plazo excedido', () => {
    const warning = getCausaDeadline(
      cause({ fechaApertura: '2026-07-01', plazoInvestigacionDias: 30 }),
      new Date('2026-07-27T12:00:00.000Z'),
    );
    const overdue = getCausaDeadline(
      cause({ fechaApertura: '2026-07-01', plazoInvestigacionDias: 10 }),
      new Date('2026-07-20T12:00:00.000Z'),
    );
    assert.equal(warning.tone, 'warning');
    assert.equal(overdue.text, 'Plazo excedido');
  });

  it('mantiene la bitácora y checklist como fuentes del detalle', () => {
    const panels = read('../timeline/TimelineTabPanels.tsx');
    const process = read('../timeline/ProcessChecklist.tsx');
    const checklistItemCard = read('../timeline/ChecklistItemCard.tsx');
    const checklistRegistration = read('../../shared/lib/hooks/useChecklistRegistration.ts');
    assert.match(panels, /<BitacoraTab/);
    assert.match(process, /causa\.checklistDebidoProceso\.filter/);
    assert.match(checklistItemCard, /item\.registradoPor/);
    assert.match(checklistItemCard, /item\.fechaCompletado/);
    assert.match(process, /Abrir hitos/);
    assert.doesNotMatch(checklistRegistration, /recepcion: true/);
    assert.doesNotMatch(checklistRegistration, /investigacion: true/);
  });

  it('usa color contextual suave en las tarjetas de resumen del expediente', () => {
    const summary = read('../timeline/ResumenTab.tsx');

    assert.match(summary, /bg-violet-50/);
    assert.match(summary, /bg-sky-50/);
    assert.match(summary, /bg-grave-50/);
    assert.match(summary, /bg-leve-50/);
  });

  it('muestra la ruta, plazo, próximo hito y actividad sin nuevas fuentes de datos', () => {
    const route = read('../timeline/RutaExpedienteTab.tsx');
    const operationalSummary = read('causaOperationalSummary.ts');

    assert.match(route, /Ruta del expediente/);
    assert.match(route, /Próximo hito/);
    assert.match(route, /Actividad registrada/);
    assert.match(route, /Plazo:/);
    assert.match(operationalSummary, /causa\.checklistDebidoProceso/);
    assert.match(operationalSummary, /causa\.bitacora/);
  });

  it('alinea el historial de causas con el registro manual y las tarjetas de anotaciones', () => {
    const causesHistory = read('../timeline/BitacoraTab.tsx');
    const annotationHistoryForm = read(
      '../anotaciones/AnotacionesStudentDetailModal/ManualHistoryEntryForm.tsx',
    );
    const sharedHistoryForm = read('../../shared/ui/HistoryEntryForm.tsx');

    assert.match(causesHistory, /HistoryEntryForm/);
    assert.match(causesHistory, /Detalles del registro/);
    assert.match(causesHistory, /rounded-xl border border-neutral-200 bg-white p-4 shadow-xs/);
    assert.match(causesHistory, /NotebookPen/);
    assert.match(annotationHistoryForm, /HistoryEntryForm/);
    assert.match(sharedHistoryForm, /Nueva entrada en el historial/);
    assert.match(sharedHistoryForm, /Registrar entrada manual/);
  });

  it('no selecciona automáticamente la primera causa al cargar el listado', () => {
    const workspace = read('../../app/hooks/useCausaWorkspace.ts');
    assert.match(workspace, /setSelectedCausaId\(''\)/);
    assert.doesNotMatch(workspace, /setSelectedCausaId\(causasQuery\.data\[0\]/);
  });

  it('no reinicia Zustand en bucle mientras la sesión aún no está autenticada', () => {
    const workspace = read('../../app/hooks/useCausaWorkspace.ts');

    assert.match(workspace, /if \(causas\.length > 0\) setCausas\(\[\]\);/);
    assert.match(workspace, /if \(selectedCausaId\) setSelectedCausaId\(''\);/);
  });

  it('mantiene el borrador contextual y simplifica su edición antes de imprimir', () => {
    const workspace = read('MainContent/CaseLegalWorkspace.tsx');
    const draft = read('../timeline/DraftPanel.tsx');

    assert.match(workspace, /useAuditDraft\(\{ causa \}\)/);
    assert.match(workspace, /<DraftPanel/);
    assert.match(workspace, /<AuditPanel/);
    assert.match(draft, /informe_cierre_indagacion/);
    assert.match(draft, /informe_concluyente/);
    assert.match(draft, /<details/);
    assert.match(draft, /Ver vista previa para impresión Oficio/);
  });

  it('redirige la redacción de la notificación de apertura al checklist de Recepción', () => {
    const draft = read('../timeline/DraftPanel.tsx');

    assert.match(draft, /DOC_TYPE_OPTIONS/);
    assert.match(draft, /hito chk_rec_3 del checklist de Recepción/);
    assert.match(draft, /informe_cierre_indagacion/);
    assert.match(draft, /informe_concluyente/);
  });

  it('mantiene Plantillas como administración clara, con estados de acceso y sin recargas repetidas', () => {
    const advisor = read('MainContent/AdvisorView.tsx');
    const templates = read('../document-templates/TemplateEditor.tsx');
    const templatesService = read('../../shared/api/services/documentTemplates.service.ts');

    assert.doesNotMatch(advisor, /Asistente de convivencia escolar/);
    assert.match(advisor, /hitos, checklist, adjuntos y fuentes jurídicas/);
    assert.match(templates, /Plantillas institucionales/);
    assert.match(templates, /No hay plantillas institucionales disponibles/);
    assert.match(templates, /min-h-\[440px\]/);
    assert.match(templates, /selectedIdRef/);
    assert.match(templates, /useQuery/);
    assert.match(templates, /queryKey: \['document-templates', tenantId\]/);
    assert.match(templates, /TEMPLATE_ADMIN_ROLES/);
    assert.match(templates, /ACTIVE_TEMPLATE_DOC_TYPES/);
    assert.match(templates, /fetchAdminDocumentTemplates/);
    assert.match(templatesService, /solo para Dirección y Administración/);
    assert.match(templatesService, /updateDocumentTemplate/);
  });

  it('deja el membrete y los metadatos al formato de impresión, no al cuerpo generado', () => {
    const draftRoute = read('../../../server/api/routes/draft.ts');

    assert.match(draftRoute, /No los repitas en el cuerpo/);
    assert.match(draftRoute, /templatePrompt \|\| getTemplateFallback\(\)/);
  });
});
