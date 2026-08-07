/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeBreaches } from './useBreaches';
import type { Causa, ChecklistItem, EstadoCausa, TipoInfraccion } from '@/shared/lib/types';

function makeChecklist(overrides: Array<{ id: string; completado: boolean }>): ChecklistItem[] {
  return overrides.map((o) => ({
    id: o.id,
    label: o.id,
    descripcion: 'Item de debido proceso',
    completado: o.completado,
    requeridoPor: 'Circular 482' as const,
  }));
}

function makeCausa(overrides: Partial<Causa> = {}): Causa {
  return {
    id: 'DC-2026-001',
    estudianteNombre: 'Estudiante',
    estudianteCurso: '8° Básico A',
    nnaProtectedName: 'E.P.',
    runEstudiante: '23.456.789-K',
    fechaApertura: '2026-08-01',
    estadoActual: 'Recepción de Denuncia' as EstadoCausa,
    tipoInfraccion: 'Leve' as TipoInfraccion,
    responsable: 'Inspectoría',
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: '2026-08-01',
    observaciones: '',
    bitacora: [],
    checklistDebidoProceso: makeChecklist([]),
    ...overrides,
  };
}

describe('computeBreaches', () => {
  it('retorna vacío para una causa sin brechas', () => {
    const causa = makeCausa();
    assert.deepEqual(computeBreaches(causa), []);
  });

  it('alerta de resguardo para falta grave sin chk_inv_2 en fase avanzada', () => {
    const causa = makeCausa({
      tipoInfraccion: 'Grave',
      estadoActual: 'En Proceso de Indagación' as EstadoCausa,
    });
    const breaches = computeBreaches(causa);
    assert.ok(breaches.some((b) => b.includes('Alerta de Resguardo')));
    assert.ok(breaches.some((b) => b.includes('Falta Grave')));
  });

  it('no alerta resguardo si chk_inv_2 está completado', () => {
    const causa = makeCausa({
      tipoInfraccion: 'Gravísima',
      estadoActual: 'En Proceso de Indagación' as EstadoCausa,
      checklistDebidoProceso: makeChecklist([{ id: 'chk_inv_2', completado: true }]),
    });
    assert.ok(!computeBreaches(causa).some((b) => b.includes('Alerta de Resguardo')));
  });

  it('no alerta resguardo en fase de recepción', () => {
    const causa = makeCausa({ tipoInfraccion: 'Grave' });
    assert.ok(!computeBreaches(causa).some((b) => b.includes('Alerta de Resguardo')));
  });

  it('alerta socioemocional para alta complejidad en seguimiento sin chk_seg_1', () => {
    const causa = makeCausa({
      tipoInfraccion: 'Muy Grave',
      estadoActual: 'En Proceso de Seguimiento' as EstadoCausa,
    });
    assert.ok(computeBreaches(causa).some((b) => b.includes('Alerta Socioemocional')));
  });

  it('no alerta socioemocional si chk_seg_1 está completado', () => {
    const causa = makeCausa({
      tipoInfraccion: 'Gravísima',
      estadoActual: 'En Proceso de Seguimiento' as EstadoCausa,
      checklistDebidoProceso: makeChecklist([{ id: 'chk_seg_1', completado: true }]),
    });
    assert.ok(!computeBreaches(causa).some((b) => b.includes('Alerta Socioemocional')));
  });

  it('detecta contradicción con Aula Segura en mediación activa', () => {
    const causa = makeCausa({
      comprometeAulaSegura: true,
      estadoActual: 'Mediación en Desarrollo' as EstadoCausa,
    });
    assert.ok(computeBreaches(causa).some((b) => b.includes('Contradicción Procedimental')));
  });

  it('detecta plazo de investigación vencido', () => {
    const causa = makeCausa({
      fechaApertura: '2026-01-01', // más de 60 días hábiles atrás
      estadoActual: 'En Proceso de Indagación' as EstadoCausa,
    });
    const breaches = computeBreaches(causa);
    assert.ok(breaches.some((b) => b.includes('INCUMPLIMIENTO LEGAL')));
    assert.ok(breaches.some((b) => b.includes('Art. 16E, letra g')));
  });

  it('detecta suspensión que excede el máximo legal', () => {
    const causa = makeCausa({
      fechaInicioSuspension: '2026-08-01',
      duracionSuspensionDias: 30,
    });
    assert.ok(computeBreaches(causa).some((b) => b.includes('INCUMPLIMIENTO LEGAL')));
  });

  it('alerta por suspensión sin monitoreo pedagógico', () => {
    const causa = makeCausa({
      fechaInicioSuspension: '2026-08-01',
      duracionSuspensionDias: 5,
      monitoreoPedagogico: false,
    });
    assert.ok(computeBreaches(causa).some((b) => b.includes('monitoreo pedagógico obligatorio')));
  });

  it('no alerta por monitoreo pedagógico si está activado', () => {
    const causa = makeCausa({
      fechaInicioSuspension: '2026-08-01',
      duracionSuspensionDias: 5,
      monitoreoPedagogico: true,
    });
    assert.ok(!computeBreaches(causa).some((b) => b.includes('monitoreo pedagógico')));
  });

  it('alerta por denuncia confidencial sin identidad reservada', () => {
    const causa = makeCausa({ esDenunciaConfidencial: true, identidadReservada: false });
    assert.ok(computeBreaches(causa).some((b) => b.includes('identidad del denunciante')));
  });

  it('no alerta si la identidad está reservada', () => {
    const causa = makeCausa({ esDenunciaConfidencial: true, identidadReservada: true });
    assert.ok(!computeBreaches(causa).some((b) => b.includes('identidad del denunciante')));
  });

  it('no genera brechas de plazos sin fechas de apertura/suspensión', () => {
    const causa = makeCausa({ fechaApertura: '2026-08-01' });
    assert.deepEqual(computeBreaches(causa), []);
  });

  it('combina varias brechas en orden estable', () => {
    const causa = makeCausa({
      tipoInfraccion: 'Gravísima',
      estadoActual: 'En Proceso de Indagación' as EstadoCausa,
      comprometeAulaSegura: true,
      esDenunciaConfidencial: true,
      identidadReservada: false,
      fechaApertura: '2026-01-01',
    });
    const breaches = computeBreaches(causa);
    // Resguardo + denuncia confidencial + plazo de investigación vencido
    assert.ok(breaches.length >= 3);
    assert.match(breaches[0], /Alerta de Resguardo/);
  });
});
