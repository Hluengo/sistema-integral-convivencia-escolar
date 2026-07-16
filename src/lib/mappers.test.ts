/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapInspectorateToAnnotation,
  mapCauseRowToCarta,
  mapStageRowToEtapa,
} from './mappers';

describe('mapInspectorateToAnnotation', () => {
  const row = {
    id: 'abc',
    student_id: 'stu-1',
    date_time: '2026-03-15T10:00:00Z',
    observation: 'Conducta inapropiada en clase',
    severity: 'Grave',
    type: 'Negativa',
    registered_by: 'user-1',
    created_at: '2026-03-15T12:00:00Z',
    created_by: 'user-1',
  };

  it('maps required fields', () => {
    const result = mapInspectorateToAnnotation(row);
    assert.equal(result.id, 'abc');
    assert.equal(result.student_id, 'stu-1');
    assert.equal(result.text, 'Conducta inapropiada en clase');
    assert.equal(result.date, '2026-03-15T10:00:00Z');
  });

  it('maps type correctly', () => {
    const result = mapInspectorateToAnnotation(row);
    assert.equal(result.type, 'Negativa');
  });

  it('defaults unknown type to Negativa', () => {
    const result = mapInspectorateToAnnotation({ ...row, type: 'unknown' });
    assert.equal(result.type, 'Negativa');
  });
});

describe('mapCauseRowToCarta', () => {
  const row = {
    id: 'causa-1',
    student_id: 'stu-1',
    letter_type: 'Carta de Compromiso Conductual',
    emission_date: '2026-03-01',
    status: 'Vigente',
    emitted_by: 'Inspector Pérez',
    apoderado_name: 'María González',
    annotations_count: 3,
    student_name: 'Juan Pérez',
    course: '8° Básico A',
    regulation_basis: 'Art. 24.BIS, Ley 20.845',
    created_at: '2026-03-01T10:00:00Z',
  };

  it('maps all fields', () => {
    const result = mapCauseRowToCarta(row);
    assert.equal(result.id, 'causa-1');
    assert.equal(result.status, 'Vigente');
    assert.equal(result.apoderado_name, 'María González');
  });
});

describe('mapStageRowToEtapa', () => {
  it('maps all fields', () => {
    const result = mapStageRowToEtapa({
      id: 'stg-1',
      student_id: 'stu-1',
      step_number: 1,
      stage_name: 'amonestacion',
      responsible: 'user-1',
      transition_date: '2026-03-01',
      created_at: '2026-03-01T10:00:00Z',
    });
    assert.equal(result.stage_name, 'amonestacion');
    assert.equal(result.step_number, 1);
  });
});
