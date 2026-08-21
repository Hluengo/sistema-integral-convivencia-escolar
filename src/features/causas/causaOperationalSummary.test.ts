/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getBaseChecklist } from '../../shared/lib/data';
import { EstadoCausa, type Causa } from '../../shared/lib/types';
import { getCausaOperationalSummary } from './causaOperationalSummary';

const causa = (overrides: Partial<Causa> = {}): Causa => ({
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

describe('Resumen operativo de causa', () => {
  it('identifica el siguiente hito pendiente de la fase vigente', () => {
    const summary = getCausaOperationalSummary(
      causa({
        checklistDebidoProceso: [
          {
            id: 'chk_inv_1',
            label: 'Primer hito',
            descripcion: 'Completado',
            completado: true,
            requeridoPor: 'Circular 482',
          },
          {
            id: 'chk_inv_2',
            label: 'Siguiente hito',
            descripcion: 'Pendiente',
            completado: false,
            requeridoPor: 'Ambas',
          },
        ],
      }),
    );

    assert.equal(summary.currentPhase, 'Investigación');
    assert.equal(summary.currentPhaseProgress.completed, 1);
    assert.equal(summary.currentPhaseProgress.total, 2);
    assert.equal(summary.nextChecklistItem?.label, 'Siguiente hito');
  });

  it('no propone nuevos hitos para una causa cerrada', () => {
    const summary = getCausaOperationalSummary(
      causa({
        estadoActual: EstadoCausa.CAUSA_CERRADA,
        checklistDebidoProceso: [
          {
            id: 'chk_seg_4',
            label: 'Causa Cerrada',
            descripcion: 'Pendiente de checklist',
            completado: false,
            requeridoPor: 'Reglamento Interno',
          },
        ],
      }),
    );

    assert.equal(summary.nextChecklistItem, null);
  });

  it('no sugiere derivar a mediación como obligación cuando la investigación base está completa', () => {
    const checklist = getBaseChecklist().map((item) =>
      item.id === 'chk_inv_1' || item.id === 'chk_inv_2'
        ? { ...item, completado: true, fechaCompletado: '2026-08-10' }
        : item,
    );
    const summary = getCausaOperationalSummary(causa({ checklistDebidoProceso: checklist }));

    assert.equal(summary.currentPhase, 'Investigación');
    assert.equal(summary.currentPhaseProgress.completed, 2);
    assert.equal(summary.currentPhaseProgress.total, 2);
    assert.notEqual(summary.nextChecklistItem?.id, 'chk_inv_3');
    assert.equal(summary.nextChecklistItem?.id, 'chk_res_2');
  });

  it('cuenta documentos y actividad desde antecedentes ya cargados', () => {
    const summary = getCausaOperationalSummary(
      causa({
        checklistDebidoProceso: [
          {
            id: 'chk_inv_1',
            label: 'Hito documentado',
            descripcion: 'Completado',
            completado: true,
            documentoNombre: 'acta.pdf',
            requeridoPor: 'Circular 482',
          },
        ],
        bitacora: [
          {
            id: 'bit-1',
            fecha: '2026-07-02T12:00:00Z',
            tipo: 'Evidencia',
            titulo: 'Acta incorporada',
            descripcion: 'Documento adjunto',
            participantes: [],
            documentoAdjunto: 'acta.pdf',
          },
        ],
      }),
    );

    assert.equal(summary.completedHitos, 1);
    assert.equal(summary.documentsCount, 2);
    assert.equal(summary.historyCount, 1);
  });

  it('no cuenta como actividad operativa los estados absorbidos', () => {
    const summary = getCausaOperationalSummary(
      causa({
        checklistDebidoProceso: [
          {
            id: 'chk_res_1',
            label: 'Elaboración histórica',
            descripcion: 'Estado absorbido',
            completado: true,
            requeridoPor: 'Circular 482',
          },
          {
            id: 'chk_res_2',
            label: 'Informe emitido',
            descripcion: 'Actuación visible',
            completado: true,
            requeridoPor: 'Circular 482',
          },
        ],
        estadoActual: EstadoCausa.INFORME_CONCLUYENTE_ELABORACION,
      }),
    );

    assert.equal(summary.completedHitos, 1);
  });
});
