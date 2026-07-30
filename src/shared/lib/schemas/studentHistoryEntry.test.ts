import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { studentHistoryEntrySchema } from './studentHistoryEntry';

const STUDENT_ID = 'b436cb57-5264-4363-86d7-2b5ff3e0ed20';

describe('studentHistoryEntrySchema', () => {
  it('normaliza una entrada manual válida', () => {
    assert.deepEqual(
      studentHistoryEntrySchema.parse({
        studentId: STUDENT_ID,
        title: '  Entrevista con apoderado  ',
        description: '  Se revisaron los acuerdos de seguimiento.  ',
      }),
      {
        studentId: STUDENT_ID,
        title: 'Entrevista con apoderado',
        description: 'Se revisaron los acuerdos de seguimiento.',
      },
    );
  });

  it('rechaza títulos y descripciones vacíos', () => {
    const result = studentHistoryEntrySchema.safeParse({
      studentId: STUDENT_ID,
      title: '  ',
      description: '',
    });

    assert.equal(result.success, false);
  });

  it('rechaza textos que exceden los límites de auditoría', () => {
    const result = studentHistoryEntrySchema.safeParse({
      studentId: STUDENT_ID,
      title: 'T'.repeat(121),
      description: 'D'.repeat(2001),
    });

    assert.equal(result.success, false);
  });
});
