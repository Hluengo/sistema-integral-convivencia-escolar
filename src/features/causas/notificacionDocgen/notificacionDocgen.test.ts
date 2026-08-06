/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EstadoCausa, type Causa } from '@/src/shared/lib/types';
import {
  DEFAULT_NOTIFICATION_CONTENT,
  NOTIFICACION_TITLE,
  NOTIFICATION_SECTIONS,
} from './defaultContent';
import {
  buildCausaDocumentSnapshot,
  buildNotificacionBitacoraEntry,
  buildNotificacionHito,
  buildPrefilledNotificationContent,
  parseCausaDocumentSnapshot,
} from './builders';
import {
  CAUSA_DOCUMENT_TYPE,
  NOTIFICACION_TEMPLATE_VERSION,
  NOTIFICATION_CONTENT_FIELDS,
  isNotificationContent,
} from './types';
import { buildBitacoraEntryPayload, buildChecklistItemPayload } from './builders';

const migration = readFileSync(
  resolve(
    'supabase/migrations/20260806090000_add_causa_documents_notificacion_inicio_indagacion.sql',
  ),
  'utf8',
);

const letterCss = readFileSync(
  resolve('src/features/anotaciones/docgen/letter-document.css'),
  'utf8',
);

function baseCausa(): Causa {
  return {
    id: 'DC-2026-001',
    estudianteNombre: 'Valentina Rojas Soto',
    estudianteCurso: '8° Básico A',
    nnaProtectedName: 'V.R.S.',
    runEstudiante: '21.345.678-9',
    fechaApertura: '2026-07-15',
    estadoActual: EstadoCausa.INICIO_INDAGACION_NOTIFICADO,
    tipoInfraccion: 'Grave',
    responsable: 'María González (Convivencia)',
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: '2026-07-20',
    observaciones: 'Se reporta agresión verbal entre pares durante el recreo.',
    bitacora: [
      {
        id: 'b_1',
        fecha: '2026-07-16T10:00:00-04:00',
        tipo: 'Evidencia',
        titulo: 'Registro audiovisual del patio',
        descripcion: 'Cámara de seguridad registra el incidente.',
        participantes: ['Inspectoría'],
      },
      {
        id: 'b_2',
        fecha: '2026-07-17T09:30:00-04:00',
        tipo: 'Entrevista',
        titulo: 'Entrevista a compañeros presentes',
        descripcion: 'Relatos coincidentes sobre los hechos.',
        participantes: ['María González', 'V.R.S.'],
      },
    ],
    checklistDebidoProceso: [
      {
        id: 'chk_rec_1',
        label: 'Recepción de Denuncia',
        descripcion: 'Se recibe formalmente el reporte.',
        completado: true,
        requeridoPor: 'Circular 482',
      },
      {
        id: 'chk_rec_3',
        label: 'Notificación de Inicio de Indagación',
        descripcion: 'Se informa formalmente al estudiante y al apoderado.',
        completado: false,
        requeridoPor: 'Circular 482',
      },
    ],
  };
}

describe('migración causa_documents', () => {
  it('crea la tabla con snapshot, estados y tenant por RLS', () => {
    assert.match(migration, /create table if not exists public\.causa_documents/);
    assert.match(migration, /content_snapshot jsonb not null default '{}'::jsonb/);
    assert.match(migration, /status text not null default 'Pendiente'/);
    assert.match(migration, /tenant_id uuid not null default public\.current_tenant_id\(\)/);
    assert.match(migration, /doc_type = 'notificacion_inicio_indagacion'/);
    assert.match(migration, /status in \('Pendiente', 'Notificada', 'Anulada'\)/);
  });

  it('habilita RLS con políticas de tenant y el índice compuesto', () => {
    assert.match(migration, /enable row level security/);
    assert.match(migration, /causa_documents_tenant_select/);
    assert.match(migration, /causa_documents_tenant_insert/);
    assert.match(migration, /causa_documents_tenant_update/);
    assert.match(migration, /causa_documents_tenant_delete/);
    assert.match(
      migration,
      /create index if not exists idx_causa_documents_tenant_causa_type\s+on public\.causa_documents \(tenant_id, causa_id, doc_type\);/,
    );
  });

  it('valida tenant y visibilidad dentro del RPC transaccional', () => {
    assert.match(migration, /v_tenant_id uuid := public\.current_tenant_id\(\);/);
    assert.match(migration, /causa not found or not visible/);
    assert.match(migration, /document already notified or not visible/);
    assert.doesNotMatch(migration, /p_tenant_id/);
  });

  it('expone el RPC solo a authenticated y service_role', () => {
    assert.match(migration, /security invoker/);
    assert.match(
      migration,
      /revoke all on function public\.mark_causa_document_notified\(uuid, jsonb, jsonb, jsonb\) from public;/,
    );
    assert.match(
      migration,
      /grant execute on function public\.mark_causa_document_notified\(uuid, jsonb, jsonb, jsonb\) to authenticated;/,
    );
    assert.match(
      migration,
      /grant execute on function public\.mark_causa_document_notified\(uuid, jsonb, jsonb, jsonb\) to service_role;/,
    );
  });

  it('completa checklist y bitácora con upsert atómico y fechas en Chile', () => {
    assert.match(migration, /insert into public\.checklist_items/);
    assert.match(migration, /on conflict \(id, causa_id\) do update/);
    assert.match(migration, /insert into public\.bitacora_entries/);
    assert.match(migration, /on conflict \(id\) do update/);
    assert.match(migration, /America\/Santiago/);
  });
});

describe('tipos de la notificación', () => {
  it('define tipo, versión de plantilla y 9 secciones editables', () => {
    assert.equal(CAUSA_DOCUMENT_TYPE, 'notificacion_inicio_indagacion');
    assert.equal(NOTIFICACION_TEMPLATE_VERSION, 'notificacion-inicio-indagacion-v1');
    assert.equal(NOTIFICATION_CONTENT_FIELDS.length, 9);
    assert.ok(NOTIFICATION_CONTENT_FIELDS.includes('garantiasDebidoProceso'));
  });

  it('valida contenido completo de la notificación', () => {
    assert.ok(isNotificationContent(DEFAULT_NOTIFICATION_CONTENT));
    assert.ok(!isNotificationContent({ ...DEFAULT_NOTIFICATION_CONTENT, hallazgoIncidente: 42 }));
    assert.ok(!isNotificationContent(null));
    assert.ok(!isNotificationContent({}));
  });

  it('la plantilla base está alineada a Circular 482 y al debido proceso', () => {
    assert.equal(NOTIFICACION_TITLE, 'Notificación de Inicio de Indagación');
    assert.equal(NOTIFICATION_SECTIONS.length, 9);
    assert.match(DEFAULT_NOTIFICATION_CONTENT.fundamentoProcedimiento, /Circular N?°? 482/);
    assert.match(DEFAULT_NOTIFICATION_CONTENT.garantiasDebidoProceso, /derecho a ser escuchado/);
    assert.match(
      DEFAULT_NOTIFICATION_CONTENT.advertenciaEspecial,
      /no constituye una sanción anticipada/,
    );
  });

  it('la plantilla base es concisa para caber en una sola hoja Carta', () => {
    const paragraphs = Object.values(DEFAULT_NOTIFICATION_CONTENT);
    assert.equal(paragraphs.length, 9);
    for (const paragraph of paragraphs) {
      assert.ok(
        paragraph.length <= 220,
        `el párrafo excede 220 caracteres (${paragraph.length}): ${paragraph.slice(0, 60)}…`,
      );
    }
  });

  it('la hoja de estilo define la variante compacta del documento', () => {
    assert.match(letterCss, /\.letter-document--compact/);
    assert.match(letterCss, /\.letter-document--compact \.letter-section-body/);
    assert.match(
      letterCss,
      /\.letter-document--compact \.letter-section-body\s*{[^}]*font-size:\s*9pt/m,
    );
    assert.match(letterCss, /\.letter-document--compact \.letter-section-heading/);
  });
});

describe('builders de la notificación', () => {
  it('precarga hechos reales desde las observaciones de la causa', () => {
    const content = buildPrefilledNotificationContent(baseCausa());
    assert.match(content.hallazgoIncidente, /agresión verbal entre pares/);
    assert.equal(
      content.hallazgoIncidente,
      baseCausa().observaciones,
      'debe copiar las observaciones textuales del expediente',
    );
  });

  it('lista antecedentes reales de la bitácora sin inventar hechos', () => {
    const content = buildPrefilledNotificationContent(baseCausa());
    assert.match(content.evidenciaTestimonios, /Registro audiovisual del patio/);
    assert.match(content.evidenciaTestimonios, /Entrevista a compañeros presentes/);
    assert.doesNotMatch(content.evidenciaTestimonios, /no registrada/);
  });

  it('respeta un snapshot guardado y no regenera el contenido', () => {
    const saved = {
      ...DEFAULT_NOTIFICATION_CONTENT,
      hallazgoIncidente: 'Contenido editado manualmente por el equipo.',
    };
    const content = buildPrefilledNotificationContent(baseCausa(), saved);
    assert.equal(content.hallazgoIncidente, 'Contenido editado manualmente por el equipo.');
  });

  it('construye el snapshot de trazabilidad con emisor y fechas', () => {
    const causa = baseCausa();
    const snapshot = buildCausaDocumentSnapshot({
      causa,
      privacyMode: false,
      content: DEFAULT_NOTIFICATION_CONTENT,
      apoderadoName: 'Claudia Soto',
      emittedBy: '',
    });
    assert.equal(snapshot.docType, CAUSA_DOCUMENT_TYPE);
    assert.equal(snapshot.templateVersion, NOTIFICACION_TEMPLATE_VERSION);
    assert.equal(snapshot.studentName, 'Valentina Rojas Soto');
    assert.equal(snapshot.expediente.expedienteId, causa.id);
    assert.equal(snapshot.emittedBy, 'María González');
    assert.match(snapshot.emissionDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(snapshot.emittedAt);
  });

  it('respeta el modo privacidad en el snapshot y la bitácora', () => {
    const causa = baseCausa();
    const snapshot = buildCausaDocumentSnapshot({
      causa,
      privacyMode: true,
      content: DEFAULT_NOTIFICATION_CONTENT,
      apoderadoName: 'Claudia Soto',
      emittedBy: 'María González',
    });
    assert.equal(snapshot.studentName, 'V.R.S.');

    const entry = buildNotificacionBitacoraEntry(causa, snapshot, true);
    assert.ok(entry.participantes.includes('V.R.S.'));
    assert.ok(!entry.participantes.includes('Valentina Rojas Soto'));
  });

  it('completa el hito chk_rec_3 con los datos de la emisión', () => {
    const causa = baseCausa();
    const snapshot = buildCausaDocumentSnapshot({
      causa,
      privacyMode: false,
      content: DEFAULT_NOTIFICATION_CONTENT,
      apoderadoName: 'Claudia Soto',
      emittedBy: 'María González',
    });
    const hito = buildNotificacionHito(causa, snapshot);
    assert.equal(hito.id, 'chk_rec_3');
    assert.equal(hito.completado, true);
    assert.equal(hito.requeridoPor, 'Circular 482');
    assert.equal(hito.registradoPor, 'María González');
    assert.match(hito.observaciones ?? '', /Notificación de inicio de indagación emitida/);
  });

  it('registra la entrada de bitácora tipo Notificación', () => {
    const causa = baseCausa();
    const snapshot = buildCausaDocumentSnapshot({
      causa,
      privacyMode: false,
      content: DEFAULT_NOTIFICATION_CONTENT,
      apoderadoName: 'Claudia Soto',
      emittedBy: 'María González',
    });
    const entry = buildNotificacionBitacoraEntry(causa, snapshot, false);
    assert.equal(entry.tipo, 'Notificación');
    assert.match(entry.titulo, /Notificación de Inicio de Indagación emitida/);
    assert.ok(entry.id.startsWith('b_notif_'));
  });

  it('parsa snapshots persistidos de forma segura y rechaza inválidos', () => {
    const causa = baseCausa();
    const snapshot = buildCausaDocumentSnapshot({
      causa,
      privacyMode: false,
      content: DEFAULT_NOTIFICATION_CONTENT,
      apoderadoName: 'Claudia Soto',
      emittedBy: 'María González',
    });
    const parsed = parseCausaDocumentSnapshot(snapshot as unknown as Record<string, unknown>);
    assert.ok(parsed);
    assert.equal(parsed?.emittedBy, 'María González');
    assert.equal(parseCausaDocumentSnapshot(null), null);
    assert.equal(parseCausaDocumentSnapshot({}), null);
    assert.equal(
      parseCausaDocumentSnapshot({
        ...snapshot,
        templateVersion: 'otra-version',
      } as unknown as Record<string, unknown>),
      null,
    );
  });

  it('arma los payloads del RPC en snake_case (contrato del servidor)', () => {
    const causa = baseCausa();
    const snapshot = buildCausaDocumentSnapshot({
      causa,
      privacyMode: false,
      content: DEFAULT_NOTIFICATION_CONTENT,
      apoderadoName: 'Claudia Soto',
      emittedBy: 'María González',
    });
    const hito = buildNotificacionHito(causa, snapshot);
    const checklistPayload = buildChecklistItemPayload(hito);
    assert.equal(checklistPayload.id, 'chk_rec_3');
    assert.equal(checklistPayload.completado, true);
    assert.ok('fecha_completado' in checklistPayload);
    assert.ok('requerido_por' in checklistPayload);

    const entryPayload = buildBitacoraEntryPayload({
      id: 'b_notif_x',
      fecha: '2026-07-20T10:00:00-04:00',
      tipo: 'Notificación',
      titulo: 'Notificación emitida',
      descripcion: 'Detalle',
      participantes: ['María González', 'V.R.S.'],
    });
    assert.equal(entryPayload.id, 'b_notif_x');
    assert.ok('documento_adjunto' in entryPayload);
    assert.deepEqual(entryPayload.participantes, ['María González', 'V.R.S.']);
  });
});
