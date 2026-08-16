/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { EstadoCausa } from '../types';
import { editCausaFormSchema, isValidStateTransition } from './editCausaForm';

const validInput = {
  estudianteNombre: 'Antonia Perez',
  estudianteCurso: '7 Basico A',
  runEstudiante: '12.345.678-9',
  tipoInfraccion: 'Grave',
  responsable: 'Encargado de Convivencia',
  estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
  observaciones: 'Antecedentes actualizados.',
  comprometeAulaSegura: false,
  esDenunciaConfidencial: false,
  identidadReservada: false,
  fechaInicioInvestigacion: '2026-08-04',
  fechaInicioSuspension: '',
  duracionSuspensionDias: 0,
  monitoreoPedagogico: false,
  requiereNotificacionSuperintendencia: false,
  fechaNotificacionSuperintendencia: '',
  estudianteTieneNEE: false,
  tipoNEE: '',
} as const;

test('editCausaFormSchema acepta un expediente editable válido', () => {
  const parsed = editCausaFormSchema.parse(validInput);

  assert.equal(parsed.estudianteNombre, 'Antonia Perez');
  assert.equal(parsed.estadoActual, EstadoCausa.EN_PROCESO_INDAGACION);
});

test('editCausaFormSchema rechaza RUN, estado y suspensión inválidos', () => {
  const result = editCausaFormSchema.safeParse({
    ...validInput,
    runEstudiante: 'abc',
    estadoActual: 'Estado inventado',
    duracionSuspensionDias: 16,
  });

  assert.equal(result.success, false);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path[0]);
    assert.deepEqual(fields, ['runEstudiante', 'estadoActual', 'duracionSuspensionDias']);
  }
});

test('isValidStateTransition permite avanzar una fase a la vez y retroceder', () => {
  // Misma fase: permitido.
  assert.equal(
    isValidStateTransition(
      EstadoCausa.EN_PROCESO_INDAGACION,
      EstadoCausa.RECOPILACION_EVIDENCIAS_CURSO,
    ),
    true,
  );
  // Avance de una fase (Investigación -> Resolución): permitido.
  assert.equal(
    isValidStateTransition(
      EstadoCausa.MEDIACION_FRACASADA_RETORNO,
      EstadoCausa.INFORME_CONCLUYENTE_ELABORACION,
    ),
    true,
  );
  // Retroceso (Apelación -> Resolución): permitido (corrección administrativa).
  assert.equal(
    isValidStateTransition(EstadoCausa.EN_PLAZO_APELACION, EstadoCausa.RESOLUCION_FINAL_NOTIFICADA),
    true,
  );
  // Sin cambio: permitido.
  assert.equal(
    isValidStateTransition(EstadoCausa.DENUNCIA_RECEPCIONADA, EstadoCausa.DENUNCIA_RECEPCIONADA),
    true,
  );
});

test('isValidStateTransition rechaza saltar una fase completa', () => {
  // Recepción -> Resolución salta Investigación: rechazado.
  assert.equal(
    isValidStateTransition(
      EstadoCausa.INICIO_INDAGACION_NOTIFICADO,
      EstadoCausa.INFORME_CONCLUYENTE_ELABORACION,
    ),
    false,
  );
  // Recepción -> Apelación salta dos fases: rechazado.
  assert.equal(
    isValidStateTransition(EstadoCausa.DENUNCIA_RECEPCIONADA, EstadoCausa.EN_PLAZO_APELACION),
    false,
  );
  // Investigación -> Apelación salta Resolución: rechazado.
  assert.equal(
    isValidStateTransition(EstadoCausa.EN_PROCESO_INDAGACION, EstadoCausa.APELACION_RECEPCIONADA),
    false,
  );
});
