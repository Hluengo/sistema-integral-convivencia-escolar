/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, UserRound } from 'lucide-react';
import type { Causa } from '../../shared/lib/types';
import { extractConductaFromObservation, getConductaReglamentada } from '../../reglamentoData';
import { getCausaDeadline, getCausaStatus } from '../causas/causaPresentation';
import { getCausaOperationalPhase } from '../causas/causaOperationalSummary';
import { formatChileDate } from '../../shared/lib/dateTime';
import IncidentePanel from './IncidentePanel';

interface ResumenTabProps {
  causa: Causa;
  breaches: string[];
  privacyMode: boolean;
}

export default memo(function ResumenTab({ causa, breaches, privacyMode }: ResumenTabProps) {
  const deadline = getCausaDeadline(causa);
  const completed = causa.checklistDebidoProceso.filter((item) => item.completado).length;
  const conductaDescripcion =
    getConductaReglamentada(causa.conductaRiceId)?.conducta ||
    extractConductaFromObservation(causa.observaciones);

  return (
    <div className="space-y-5">
      {causa.incidenteId && <IncidentePanel causa={causa} privacyMode={privacyMode} />}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Estado actual',
            value: getCausaStatus(causa),
            Icon: CheckCircle2,
            cardClass: 'border-violet-100 bg-violet-50',
            iconClass: 'text-violet-600',
          },
          {
            label: 'Fase actual',
            value: getCausaOperationalPhase(causa),
            Icon: FileText,
            cardClass: 'border-sky-100 bg-sky-50',
            iconClass: 'text-sky-600',
          },
          {
            label: 'Plazo de cierre',
            value: deadline.text,
            Icon: CalendarClock,
            cardClass: 'border-grave-100 bg-grave-50',
            iconClass: 'text-grave-700',
          },
          {
            label: 'Hitos registrados',
            value: `${completed} de ${causa.checklistDebidoProceso.length}`,
            Icon: UserRound,
            cardClass: 'border-leve-100 bg-leve-50',
            iconClass: 'text-leve-600',
          },
        ].map(({ label, value, Icon, cardClass, iconClass }) => (
          <div key={label} className={`rounded-xl border p-4 ${cardClass}`}>
            <Icon className={`mb-2 size-5 ${iconClass}`} aria-hidden="true" />
            <p className="text-neutral-600 text-xs">{label}</p>
            <p className="mt-1 font-semibold text-neutral-900 text-sm">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="font-semibold text-neutral-900 text-sm">Antecedentes generales</h3>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Apertura</dt>
            <dd className="font-medium">{formatChileDate(causa.fechaApertura)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Responsable</dt>
            <dd className="font-medium">{causa.responsable}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Tipificación</dt>
            <dd className="font-medium">
              {causa.comprometeAulaSegura ? 'Aula Segura' : causa.tipoInfraccion}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Última actualización</dt>
            <dd className="font-medium">{formatChileDate(causa.fechaUltimaActualizacion)}</dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-3 rounded-lg bg-neutral-50 p-3">
          <div>
            <p className="font-medium text-neutral-500 text-xs">Descripción de la falta</p>
            <p className="mt-1 text-neutral-700 text-sm">
              {conductaDescripcion || 'No se ha asociado una conducta específica del RICE.'}
            </p>
          </div>
          <div>
            <p className="font-medium text-neutral-500 text-xs">Relato de los hechos</p>
            <p className="mt-1 whitespace-pre-wrap text-neutral-700 text-sm">
              {causa.observaciones || 'Sin relato de los hechos registrado.'}
            </p>
          </div>
        </div>
      </section>

      {breaches.length > 0 && (
        <section className="rounded-xl border border-danger-200 bg-danger-50 p-4" role="alert">
          <h3 className="flex items-center gap-2 font-semibold text-danger-800 text-sm">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Alertas jurídicas o procedimentales
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-danger-800 text-sm">
            {breaches.map((breach) => (
              <li key={breach}>{breach}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
});
