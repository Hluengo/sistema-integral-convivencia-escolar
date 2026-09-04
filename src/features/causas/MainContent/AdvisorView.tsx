/** @license SPDX-License-Identifier: Apache-2.0 */

import { MessageSquare } from 'lucide-react';
import AiAdvisor from '../../ai-advisor/AiAdvisor';
import PageHeader from '@/shared/ui/PageHeader';

export default function AdvisorView() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Convivencia Escolar · Herramientas Legales"
        title="Asistente legal"
        description="Consulta normativa y criterios legales de convivencia escolar."
      />

      <div
        className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1"
        role="tablist"
        aria-label="Secciones del asistente legal"
      >
        <button
          type="button"
          role="tab"
          id="legal-tab-consulta"
          aria-selected="true"
          aria-controls="legal-panel-consulta"
          className="inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-3.5 py-2.5 font-semibold text-brand-800 text-xs shadow-sm sm:px-4"
        >
          <MessageSquare className="size-3.5" aria-hidden="true" />
          Consulta legal
        </button>
      </div>
      <div id="legal-panel-consulta" role="tabpanel" aria-labelledby="legal-tab-consulta">
        <AiAdvisor />
      </div>
    </div>
  );
}
