/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getCartaProcessingBlockReason,
  getDisciplinaryStage,
  getEffectiveDisciplinaryStage,
  getHighestPriorityLetterType,
  getNextLetterAfterPhysicalCarta,
  getNextThreshold,
  getOutstandingLetterType,
  getPhysicalCartaBaselineType,
  getStageProgress,
  getStudentCartaWorkflowLabel,
  getSuggestedLetterType,
  mapDocTypeToLetterType,
  mapLetterTypeToDocType,
  resolveStudentCartaTableState,
} from './disciplinaryStage';

test('getDisciplinaryStage: límites de cada etapa', () => {
  assert.equal(getDisciplinaryStage(0).key, 'none');
  assert.equal(getDisciplinaryStage(4).key, 'none');
  assert.equal(getDisciplinaryStage(5).key, 'amonestacion');
  assert.equal(getDisciplinaryStage(9).key, 'amonestacion');
  assert.equal(getDisciplinaryStage(10).key, 'compromiso_conductual');
  assert.equal(getDisciplinaryStage(14).key, 'compromiso_conductual');
  assert.equal(getDisciplinaryStage(15).key, 'derivacion');
  assert.equal(getDisciplinaryStage(999).key, 'derivacion');
});

test('getDisciplinaryStage: valores inválidos se tratan como 0', () => {
  assert.equal(getDisciplinaryStage(-5).key, 'none');
  assert.equal(getDisciplinaryStage(Number.NaN).key, 'none');
  assert.equal(getDisciplinaryStage(Number.POSITIVE_INFINITY).key, 'derivacion');
});

test('mapDocTypeToLetterType: mapeos válidos e inválidos', () => {
  assert.equal(mapDocTypeToLetterType('amonestacion'), 'Amonestación Escrita');
  assert.equal(mapDocTypeToLetterType('compromiso'), 'Carta de Compromiso Conductual');
  assert.equal(mapDocTypeToLetterType('compromiso_conductual'), 'Carta de Compromiso Conductual');
  assert.equal(mapDocTypeToLetterType('derivacion'), 'Ficha de Derivación');
  assert.equal(mapDocTypeToLetterType(null), null);
  assert.equal(mapDocTypeToLetterType(undefined), null);
  assert.equal(mapDocTypeToLetterType('none'), null);
  assert.equal(mapDocTypeToLetterType('desconocido'), null);
});

test('mapLetterTypeToDocType: mapeos válidos e inválidos', () => {
  assert.equal(mapLetterTypeToDocType('Amonestación Escrita'), 'amonestacion');
  assert.equal(mapLetterTypeToDocType('Carta de Compromiso Conductual'), 'compromiso_conductual');
  assert.equal(mapLetterTypeToDocType('Ficha de Derivación'), 'derivacion');
  assert.equal(mapLetterTypeToDocType('Derivación a Convivencia Escolar'), 'derivacion');
  assert.equal(mapLetterTypeToDocType(null), null);
  assert.equal(mapLetterTypeToDocType(undefined), null);
  assert.equal(mapLetterTypeToDocType('Invitación a Reunión'), null);
});

test('getSuggestedLetterType: etapa none devuelve null', () => {
  assert.equal(getSuggestedLetterType(0), null);
  assert.equal(getSuggestedLetterType(4), null);
});

test('getSuggestedLetterType: sin carta actual sugiere el tipo de la etapa', () => {
  assert.equal(getSuggestedLetterType(5), 'amonestacion');
  assert.equal(getSuggestedLetterType(10), 'compromiso_conductual');
  assert.equal(getSuggestedLetterType(15), 'derivacion');
});

test('getSuggestedLetterType: solo sugiere si la etapa supera a la carta actual', () => {
  // Está en etapa compromiso y ya tiene compromiso → no sugiere.
  assert.equal(getSuggestedLetterType(12, 'Carta de Compromiso Conductual'), null);
  // Está en etapa compromiso y ya tiene derivación → no sugiere (mismo o mayor).
  assert.equal(getSuggestedLetterType(12, 'Ficha de Derivación'), null);
  // Está en etapa derivación y ya tiene compromiso → sugiere derivación.
  assert.equal(getSuggestedLetterType(20, 'Carta de Compromiso Conductual'), 'derivacion');
});

test('getNextLetterAfterPhysicalCarta: escalera física', () => {
  assert.equal(getNextLetterAfterPhysicalCarta('Amonestación Escrita'), 'compromiso_conductual');
  assert.equal(getNextLetterAfterPhysicalCarta('Carta de Compromiso Conductual'), 'derivacion');
  assert.equal(getNextLetterAfterPhysicalCarta('Ficha de Derivación'), null);
  assert.equal(getNextLetterAfterPhysicalCarta(null), null);
  assert.equal(getNextLetterAfterPhysicalCarta(undefined), null);
});

test('getPhysicalCartaBaselineType: prioriza compromiso sobre amonestación', () => {
  const base = {
    origin: 'physical',
    school_year: 2026,
    status: 'Vigente',
    emission_date: '2026-04-01',
  };
  const result = getPhysicalCartaBaselineType(
    [
      { ...base, letter_type: 'Amonestación Escrita' },
      { ...base, letter_type: 'Carta de Compromiso Conductual' },
    ],
    2026,
  );
  assert.equal(result, 'Carta de Compromiso Conductual');
});

test('getPhysicalCartaBaselineType: amonestación cuando no hay compromiso', () => {
  const result = getPhysicalCartaBaselineType(
    [
      {
        origin: 'physical',
        school_year: 2026,
        status: 'Vigente',
        emission_date: '2026-04-01',
        letter_type: 'Amonestación Escrita',
      },
    ],
    2026,
  );
  assert.equal(result, 'Amonestación Escrita');
});

test('getPhysicalCartaBaselineType: ignora cartas anuladas, otros años y no físicas', () => {
  const result = getPhysicalCartaBaselineType(
    [
      {
        origin: 'physical',
        school_year: 2026,
        status: 'Anulada',
        emission_date: '2026-04-01',
        letter_type: 'Carta de Compromiso Conductual',
      },
      {
        origin: 'platform',
        school_year: 2026,
        status: 'Vigente',
        emission_date: '2026-04-01',
        letter_type: 'Amonestación Escrita',
      },
      {
        origin: 'physical',
        school_year: 2025,
        status: 'Vigente',
        emission_date: '2025-04-01',
        letter_type: 'Amonestación Escrita',
      },
      {
        origin: 'physical',
        status: 'Vigente',
        emission_date: '2027-03-15',
        letter_type: 'Amonestación Escrita',
      },
    ],
    2026,
  );
  assert.equal(result, null);
});

test('getPhysicalCartaBaselineType: usa school_year cuando está presente, emisión si no', () => {
  const result = getPhysicalCartaBaselineType(
    [
      {
        origin: 'physical',
        school_year: 2027,
        status: 'Vigente',
        emission_date: '2026-04-01',
        letter_type: 'Amonestación Escrita',
      },
      {
        origin: 'physical',
        status: 'Vigente',
        emission_date: '2026-03-15',
        letter_type: 'Carta de Compromiso Conductual',
      },
    ],
    2026,
  );
  assert.equal(result, 'Carta de Compromiso Conductual');
});

test('getHighestPriorityLetterType: prioriza mayor rango y descarta nulls', () => {
  assert.equal(getHighestPriorityLetterType('amonestacion', 'derivacion'), 'derivacion');
  assert.equal(getHighestPriorityLetterType('derivacion', 'amonestacion'), 'derivacion');
  assert.equal(
    getHighestPriorityLetterType(null, 'compromiso_conductual'),
    'compromiso_conductual',
  );
  assert.equal(getHighestPriorityLetterType(null, undefined), null);
});

test('getOutstandingLetterType: carta completada de mayor o igual rango bloquea', () => {
  assert.equal(getOutstandingLetterType('Carta de Compromiso Conductual', 'amonestacion'), null);
  assert.equal(
    getOutstandingLetterType('Carta de Compromiso Conductual', 'derivacion'),
    'derivacion',
  );
  assert.equal(getOutstandingLetterType('Ficha de Derivación', 'derivacion'), null);
  assert.equal(getOutstandingLetterType(null, 'amonestacion'), 'amonestacion');
  assert.equal(getOutstandingLetterType('Amonestación Escrita', null), null);
});

test('resolveStudentCartaTableState: sin cartas del año → none', () => {
  const state = resolveStudentCartaTableState([], 2026);
  assert.deepEqual(state, {
    completedLetterType: null,
    currentLetterType: null,
    workflowStatus: 'none',
  });
});

test('resolveStudentCartaTableState: filtra cartas anuladas y de otro año', () => {
  const state = resolveStudentCartaTableState(
    [
      {
        letter_type: 'Amonestación Escrita',
        emission_date: '2025-04-01',
        status: 'Vigente',
        workflow_status: 'pending',
      },
      {
        letter_type: 'Ficha de Derivación',
        emission_date: '2026-04-01',
        status: 'Anulada',
        workflow_status: 'pending',
      },
      {
        letter_type: 'Carta de Compromiso Conductual',
        emission_date: '2026-04-01',
        status: 'Vigente',
        workflow_status: 'annulled',
      },
    ],
    2026,
  );
  assert.deepEqual(state, {
    completedLetterType: null,
    currentLetterType: null,
    workflowStatus: 'none',
  });
});

test('resolveStudentCartaTableState: pending sin timestamps de proceso', () => {
  const state = resolveStudentCartaTableState(
    [
      {
        letter_type: 'Amonestación Escrita',
        emission_date: '2026-04-01',
        status: 'Vigente',
        workflow_status: 'pending',
      },
    ],
    2026,
  );
  assert.deepEqual(state, {
    completedLetterType: null,
    currentLetterType: 'Amonestación Escrita',
    workflowStatus: 'pending',
  });
});

test('resolveStudentCartaTableState: completed por registered_at', () => {
  const state = resolveStudentCartaTableState(
    [
      {
        letter_type: 'Amonestación Escrita',
        emission_date: '2026-04-01',
        status: 'Vigente',
        workflow_status: 'pending',
        registered_at: '2026-04-02T12:00:00.000Z',
      },
    ],
    2026,
  );
  assert.deepEqual(state, {
    completedLetterType: 'Amonestación Escrita',
    currentLetterType: 'Amonestación Escrita',
    workflowStatus: 'completed',
  });
});

test('resolveStudentCartaTableState: archived por workflow_status', () => {
  const state = resolveStudentCartaTableState(
    [
      {
        letter_type: 'Amonestación Escrita',
        emission_date: '2026-04-01',
        status: 'Vigente',
        workflow_status: 'archived',
      },
    ],
    2026,
  );
  assert.deepEqual(state, {
    completedLetterType: 'Amonestación Escrita',
    currentLetterType: 'Amonestación Escrita',
    workflowStatus: 'archived',
  });
});

test('resolveStudentCartaTableState: ordena por rango y completed primero', () => {
  const state = resolveStudentCartaTableState(
    [
      {
        letter_type: 'Amonestación Escrita',
        emission_date: '2026-04-01',
        status: 'Vigente',
        workflow_status: 'pending',
      },
      {
        letter_type: 'Ficha de Derivación',
        emission_date: '2026-05-01',
        status: 'Vigente',
        workflow_status: 'completed',
        registered_at: '2026-05-02T12:00:00.000Z',
      },
    ],
    2026,
  );
  assert.equal(state.currentLetterType, 'Ficha de Derivación');
  assert.equal(state.completedLetterType, 'Ficha de Derivación');
  assert.equal(state.workflowStatus, 'completed');
});

test('getEffectiveDisciplinaryStage: carta completada de mayor etapa sube el umbral', () => {
  const stage = getEffectiveDisciplinaryStage(3, 'Carta de Compromiso Conductual');
  assert.equal(stage.key, 'compromiso_conductual');
});

test('getEffectiveDisciplinaryStage: carta completada menor o igual no cambia', () => {
  assert.equal(
    getEffectiveDisciplinaryStage(12, 'Amonestación Escrita').key,
    'compromiso_conductual',
  );
  assert.equal(
    getEffectiveDisciplinaryStage(12, 'Carta de Compromiso Conductual').key,
    'compromiso_conductual',
  );
  assert.equal(getEffectiveDisciplinaryStage(12, null).key, 'compromiso_conductual');
});

test('getStudentCartaWorkflowLabel: flujo por estado y etapa efectiva', () => {
  assert.equal(getStudentCartaWorkflowLabel(5, null), null);
  // Pendiente con etapa efectiva compromiso y carta pendiente.
  assert.equal(
    getStudentCartaWorkflowLabel(12, {
      completedLetterType: null,
      currentLetterType: 'Carta de Compromiso Conductual',
      workflowStatus: 'pending',
    }),
    'Pendiente',
  );
  // Procesada: carta completada coincide con etapa efectiva.
  assert.equal(
    getStudentCartaWorkflowLabel(12, {
      completedLetterType: 'Carta de Compromiso Conductual',
      currentLetterType: 'Carta de Compromiso Conductual',
      workflowStatus: 'completed',
    }),
    'Procesada',
  );
  // Archivada explícita.
  assert.equal(
    getStudentCartaWorkflowLabel(12, {
      completedLetterType: 'Carta de Compromiso Conductual',
      currentLetterType: 'Carta de Compromiso Conductual',
      workflowStatus: 'archived',
    }),
    'Archivada',
  );
  // Archivada sin carta completada pero estado archivado.
  assert.equal(
    getStudentCartaWorkflowLabel(12, {
      completedLetterType: null,
      currentLetterType: 'Amonestación Escrita',
      workflowStatus: 'archived',
    }),
    'Archivada',
  );
  // Completed sin carta completada.
  assert.equal(
    getStudentCartaWorkflowLabel(12, {
      completedLetterType: null,
      currentLetterType: 'Amonestación Escrita',
      workflowStatus: 'completed',
    }),
    'Procesada',
  );
  // Sin estados reconocibles → null.
  assert.equal(
    getStudentCartaWorkflowLabel(12, {
      completedLetterType: null,
      currentLetterType: null,
      workflowStatus: 'none',
    }),
    null,
  );
});

test('getCartaProcessingBlockReason: derivación requiere 15 anotaciones registradas', () => {
  assert.equal(
    getCartaProcessingBlockReason('derivacion', null, 14),
    'derivacion_requires_15_registered',
  );
  assert.equal(getCartaProcessingBlockReason('derivacion', null, 15), null);
  assert.equal(
    getCartaProcessingBlockReason('derivacion', 'derivacion', 2),
    'derivacion_requires_15_registered',
  );
});

test('getCartaProcessingBlockReason: mismatch cuando el tipo no coincide con el esperado', () => {
  assert.equal(
    getCartaProcessingBlockReason('amonestacion', 'derivacion', 20),
    'letter_type_mismatch',
  );
  assert.equal(getCartaProcessingBlockReason('derivacion', 'derivacion', 20), null);
  assert.equal(getCartaProcessingBlockReason('amonestacion', null, 5), null);
});

test('getNextThreshold: umbrales ascendentes y máximo', () => {
  assert.equal(getNextThreshold(0), 5);
  assert.equal(getNextThreshold(4), 5);
  assert.equal(getNextThreshold(5), 10);
  assert.equal(getNextThreshold(9), 10);
  assert.equal(getNextThreshold(10), 15);
  assert.equal(getNextThreshold(14), 15);
  assert.equal(getNextThreshold(15), null);
  assert.equal(getNextThreshold(100), null);
  assert.equal(getNextThreshold(-3), 5);
});

test('getStageProgress: sin siguiente umbral llega a 100%', () => {
  const progress = getStageProgress(20);
  assert.equal(progress.nextThreshold, null);
  assert.equal(progress.percent, 100);
  assert.equal(progress.remaining, 0);
  assert.equal(progress.previousThreshold, 15);
});

test('getStageProgress: porcentaje parcial dentro del rango', () => {
  const progress = getStageProgress(7);
  assert.equal(progress.nextThreshold, 10);
  assert.equal(progress.previousThreshold, 5);
  // (7 - 5) / (10 - 5) = 0.4
  assert.equal(progress.percent, 40);
  assert.equal(progress.remaining, 3);
});

test('getStageProgress: primer tramo desde 0 y clamp en 100', () => {
  assert.equal(getStageProgress(0).previousThreshold, 0);
  assert.equal(getStageProgress(4).percent, 80);
  assert.equal(getStageProgress(4).remaining, 1);
});
