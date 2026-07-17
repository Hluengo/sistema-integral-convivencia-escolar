/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CausaSchema, ChecklistItemSchema, BitacoraEntrySchema } from './schemas';

describe('CausaSchema', () => {
  const validCausa = {
    id: 'DC-2026-001',
    estudianteNombre: 'Juan Pérez',
    estudianteCurso: '8° Básico A',
    nnaProtectedName: 'J.P.',
    runEstudiante: '12.345.678-9',
    fechaApertura: '2026-07-17',
    estadoActual: 'Recepción de Denuncia',
    tipoInfraccion: 'Grave',
    responsable: 'Inspector Pérez',
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: '2026-07-17',
    observaciones: 'Observación de prueba',
    bitacora: [],
    checklistDebidoProceso: [],
  };

  it('accepts a valid causa', () => {
    const parsed = CausaSchema.parse(validCausa);
    assert.equal(parsed.id, 'DC-2026-001');
    assert.equal(parsed.estudianteNombre, 'Juan Pérez');
    assert.deepEqual(parsed.bitacora, []);
    assert.deepEqual(parsed.checklistDebidoProceso, []);
  });

  it('rejects missing required fields', () => {
    assert.throws(() => CausaSchema.parse({}), (err: unknown) => {
      const zErr = err as { issues?: Array<{ path: (string | number)[] }> };
      return zErr.issues !== undefined && zErr.issues.length > 0;
    });
  });

  it('accepts undefined optional fields', () => {
    const parsed = CausaSchema.parse({
      ...validCausa,
      conductaRiceId: undefined,
      medidasEjecutadas: undefined,
    });
    assert.equal(parsed.conductaRiceId, undefined);
    assert.ok(parsed.medidasEjecutadas === undefined || Array.isArray(parsed.medidasEjecutadas));
  });

  it('accepts all tipoInfraccion values', () => {
    for (const tipo of ['Leve', 'Grave', 'Muy Grave', 'Gravísima'] as const) {
      const parsed = CausaSchema.parse({ ...validCausa, tipoInfraccion: tipo });
      assert.equal(parsed.tipoInfraccion, tipo);
    }
  });

  it('rejects invalid tipoInfraccion', () => {
    assert.throws(() =>
      CausaSchema.parse({ ...validCausa, tipoInfraccion: 'Invalida' })
    );
  });

  it('rejects invalid estadoActual', () => {
    assert.throws(() =>
      CausaSchema.parse({ ...validCausa, estadoActual: 'Estado Inexistente' })
    );
  });
});

describe('ChecklistItemSchema', () => {
  it('accepts a valid checklist item', () => {
    const parsed = ChecklistItemSchema.parse({
      id: 'item-1',
      label: 'Notificar apoderado',
      descripcion: 'Enviar carta de notificación',
      completado: false,
      requeridoPor: 'Circular 482',
    });
    assert.equal(parsed.id, 'item-1');
    assert.equal(parsed.completado, false);
    assert.equal(parsed.requeridoPor, 'Circular 482');
  });

  it('accepts completed item with optional fields', () => {
    const parsed = ChecklistItemSchema.parse({
      id: 'item-2',
      label: 'Citar apoderado',
      descripcion: 'Cita presencial',
      completado: true,
      fechaCompletado: '2026-07-17',
      requeridoPor: 'Ley 21809',
      registradoPor: 'Inspector Pérez',
      observaciones: 'Todo en orden',
      documentoNombre: 'citacion.pdf',
      documentoUrl: 'https://supabase.co/storage/v1/...',
    });
    assert.equal(parsed.completado, true);
    assert.equal(parsed.fechaCompletado, '2026-07-17');
    assert.equal(parsed.registradoPor, 'Inspector Pérez');
  });

  it('accepts all requeridoPor values', () => {
    const values = ['Circular 482', 'Ley 21809', 'Reglamento Interno', 'Ambas'] as const;
    for (const v of values) {
      const parsed = ChecklistItemSchema.parse({
        id: 'item-x',
        label: 'Test',
        descripcion: 'Test',
        completado: false,
        requeridoPor: v,
      });
      assert.equal(parsed.requeridoPor, v);
    }
  });

  it('rejects missing requeridoPor', () => {
    assert.throws(() =>
      ChecklistItemSchema.parse({
        id: 'item-3',
        label: 'Test',
        descripcion: 'Test desc',
        completado: false,
      })
    );
  });

  it('accepts a queja/denuncia requeridoPor', () => {
    const parsed = ChecklistItemSchema.parse({
      id: 'item-4',
      label: 'Derivar a mediación',
      descripcion: 'Derivar el caso a mediación',
      completado: false,
      requeridoPor: 'Ambas',
    });
    assert.equal(parsed.label, 'Derivar a mediación');
    assert.equal(parsed.requeridoPor, 'Ambas');
  });

  it('rejects invalid requeridoPor', () => {
    assert.throws(() =>
      ChecklistItemSchema.parse({
        id: 'item-5',
        label: 'Test',
        descripcion: 'Test',
        completado: false,
        requeridoPor: 'Ley Inexistente',
      })
    );
  });
});

describe('BitacoraEntrySchema', () => {
  const validEntry = {
    id: 'entry-1',
    fecha: '2026-07-17',
    tipo: 'Entrevista',
    titulo: 'Reunión con apoderado',
    descripcion: 'Se acordó compromiso',
    participantes: ['María García'],
  };

  it('accepts a valid entry', () => {
    const parsed = BitacoraEntrySchema.parse(validEntry);
    assert.equal(parsed.id, 'entry-1');
    assert.equal(parsed.tipo, 'Entrevista');
    assert.deepEqual(parsed.participantes, ['María García']);
  });

  it('accepts all tipo values', () => {
    const values = ['Entrevista', 'Evidencia', 'Notificación', 'Mediación', 'Resolución', 'Otro'] as const;
    for (const tipo of values) {
      const parsed = BitacoraEntrySchema.parse({ ...validEntry, tipo });
      assert.equal(parsed.tipo, tipo);
    }
  });

  it('rejects invalid tipo', () => {
    assert.throws(() =>
      BitacoraEntrySchema.parse({ ...validEntry, tipo: 'Reunión' })
    );
  });

  it('accepts entry without participantes', () => {
    const parsed = BitacoraEntrySchema.parse({
      ...validEntry,
      participantes: [],
    });
    assert.deepEqual(parsed.participantes, []);
  });

  it('accepts entry with documentoAdjunto', () => {
    const parsed = BitacoraEntrySchema.parse({
      ...validEntry,
      documentoAdjunto: 'https://supabase.co/storage/v1/...',
    });
    assert.equal(parsed.documentoAdjunto, 'https://supabase.co/storage/v1/...');
  });
});
