/** @license SPDX-License-Identifier: Apache-2.0 */

import { useQuery } from '@tanstack/react-query';
import { CalendarClock, File, FileStack, MapPin, Users } from 'lucide-react';
import {
  fetchIncidente,
  fetchIncidenteCausas,
  fetchIncidenteSharedActivity,
} from '../../shared/api/services/incidentes.service';
import type { Causa } from '../../shared/lib/types';
import { formatChileDateTime } from '../../shared/lib/dateTime';
import { openDocument } from '../../shared/api/services/storage.service';

interface IncidentePanelProps {
  causa: Causa;
  privacyMode: boolean;
}

export default function IncidentePanel({ causa, privacyMode }: IncidentePanelProps) {
  const incidenteId = causa.incidenteId;
  const { data, isLoading } = useQuery({
    queryKey: ['incidente', incidenteId],
    queryFn: async () => {
      const [incidente, causas] = await Promise.all([
        fetchIncidente(incidenteId!),
        fetchIncidenteCausas(incidenteId!),
      ]);
      const activity = await fetchIncidenteSharedActivity(incidenteId!, causas);
      return { incidente, causas, activity };
    },
    enabled: Boolean(incidenteId),
    staleTime: 5 * 60_000,
  });

  if (!incidenteId) return null;
  if (isLoading) {
    return <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-800 text-sm">Cargando incidente grupal…</section>;
  }
  if (!data?.incidente) return null;

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-4" aria-labelledby="incident-group-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="incident-group-title" className="flex items-center gap-2 font-semibold text-sky-950 text-sm">
            <Users className="size-4 text-sky-700" aria-hidden="true" /> Incidente grupal
          </h3>
          <p className="mt-1 font-mono text-10px text-sky-800">{incidenteId}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 font-semibold text-10px text-sky-800">
          {data.causas.length} expedientes vinculados
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div className="flex items-start gap-1.5">
          <CalendarClock className="mt-0.5 size-3.5 text-sky-700" aria-hidden="true" />
          <div><dt className="text-sky-800/70">Fecha</dt><dd className="font-medium text-sky-950">{formatChileDateTime(data.incidente.fechaHora)}</dd></div>
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-3.5 text-sky-700" aria-hidden="true" />
          <div><dt className="text-sky-800/70">Lugar</dt><dd className="font-medium text-sky-950">{data.incidente.lugar || 'No informado'}</dd></div>
        </div>
        <div className="flex items-start gap-1.5">
          <FileStack className="mt-0.5 size-3.5 text-sky-700" aria-hidden="true" />
          <div><dt className="text-sky-800/70">Tipo</dt><dd className="font-medium text-sky-950">{data.incidente.tipo}</dd></div>
        </div>
      </dl>
      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white/70 p-2.5 text-xs text-sky-950">
        {data.incidente.descripcion}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.causas.map((linkedCausa) => (
          <span key={linkedCausa.id} className="rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-10px text-sky-950">
            <strong>{privacyMode ? linkedCausa.nnaProtectedName : linkedCausa.estudianteNombre}</strong>
            <span className="ml-1 text-sky-800/70">· {linkedCausa.id} · {linkedCausa.estadoActual}</span>
          </span>
        ))}
      </div>
      {data.activity.length > 0 && (
        <div className="mt-4 rounded-lg border border-sky-200 bg-white/70 p-3">
          <h4 className="font-semibold text-sky-950 text-xs">Avances e hitos compartidos</h4>
          <div className="mt-2 space-y-2">
            {data.activity.map((activity) => {
              const source = data.causas.find((linkedCausa) => linkedCausa.id === activity.sourceCausaId);
              return (
                <article key={`${activity.kind}-${activity.id}`} className="rounded-lg border border-sky-100 bg-white p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-neutral-900 text-xs">{activity.title}</p>
                      <p className="text-10px text-sky-800">
                        {activity.kind === 'hito' ? 'Hito' : 'Avance'} · {privacyMode ? source?.nnaProtectedName : source?.estudianteNombre}
                      </p>
                    </div>
                    <time className="font-mono text-9px text-neutral-500">
                      {formatChileDateTime(activity.occurredAt)}
                    </time>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-neutral-600 text-11px">{activity.description}</p>
                  {activity.documentUrl && (
                    <button
                      type="button"
                      onClick={() => void openDocument(activity.documentUrl || '')}
                      className="mt-1.5 inline-flex items-center gap-1 font-semibold text-info-700 text-10px hover:underline"
                    >
                      <File className="size-3" aria-hidden="true" />
                      {activity.documentName || 'Ver documento adjunto'}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
