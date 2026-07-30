/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { EstadoCausa, type Causa } from '../../types';
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

  it('abre un modal accesible y expone las cinco fases como pestañas', () => {
    const view = read('MainContent/CausasView.tsx');
    const modal = read('CausaDetailModal.tsx');
    const tabs = read('../timeline/TimelineTabs.tsx');

    assert.match(view, /<CausaDetailModal/);
    assert.match(modal, /<Dialog open=/);
    assert.match(modal, /onOpenChange/);
    assert.match(modal, /<DetailModalContent/);
    for (const phase of ['Recepción', 'Investigación', 'Resolución', 'Apelación', 'Seguimiento']) {
      assert.match(tabs, new RegExp(phase));
    }
    assert.match(tabs, /Resumen/);
    assert.match(tabs, /Historial/);
    assert.match(tabs, /Asistente legal/);
    assert.match(tabs, /getPhaseProgress/);
    assert.match(tabs, /bg-emerald-500/);
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
    assert.match(panels, /<BitacoraTab/);
    assert.match(process, /causa\.checklistDebidoProceso\.filter/);
    assert.match(process, /item\.registradoPor/);
    assert.match(process, /item\.fechaCompletado/);
  });

  it('usa color contextual suave en las tarjetas de resumen del expediente', () => {
    const summary = read('../timeline/ResumenTab.tsx');

    assert.match(summary, /bg-violet-50/);
    assert.match(summary, /bg-sky-50/);
    assert.match(summary, /bg-amber-50/);
    assert.match(summary, /bg-emerald-50/);
  });

  it('no selecciona automáticamente la primera causa al cargar el listado', () => {
    const app = read('../../app/App.tsx');
    assert.match(app, /setSelectedCausaId\(''\)/);
    assert.doesNotMatch(app, /setSelectedCausaId\(causasQuery\.data\[0\]/);
  });
});
