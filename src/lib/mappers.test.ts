/** @license SPDX-License-Identifier: Apache-2.0 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapInspectorateRow } from './mappers.ts';

describe('mapInspectorateRow', () => {
  it('maps observation, date_time, type and severity', () => {
    const ann = mapInspectorateRow({
      id: 'a1',
      student_id: 's1',
      observation: 'Uso de celular',
      date_time: '2026-05-01T10:00:00Z',
      type: 'Negativa',
      severity: 'Grave',
      registered_by: 'Inspectoría',
    });
    assert.equal(ann.text, 'Uso de celular');
    assert.equal(ann.date, '2026-05-01');
    assert.equal(ann.type, 'Negativa');
    assert.equal(ann.severity, 'Grave');
  });

  it('defaults severity and type safely', () => {
    const ann = mapInspectorateRow({
      id: 'a2',
      student_id: 's1',
      observation: 'Mérito',
      date_time: '2026-05-02',
    });
    assert.equal(ann.severity, 'Leve');
    assert.equal(ann.type, 'Negativa');
  });
});
