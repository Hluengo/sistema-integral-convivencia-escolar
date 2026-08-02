import { useMemo, useState } from 'react';
import { FileSignature, FileText, Gavel, MessageSquare, ShieldCheck } from 'lucide-react';
import type { Causa } from '../../../shared/lib/types';
import AiAdvisor from '../../../components/AiAdvisor';
import TemplateEditor from '../../document-templates/TemplateEditor';
import CaseLegalWorkspace, { type CaseLegalTool } from './CaseLegalWorkspace';

type LegalTab = 'consulta' | 'redaccion' | 'plantillas' | 'auditoria';

interface AdvisorViewProps {
  causas: Causa[];
  selectedCausa: Causa | undefined;
  selectedCausaId: string;
  isCausaDetailLoading: boolean;
  privacyMode: boolean;
  onSelectCausa: (id: string) => void;
}

const LEGAL_TABS: Array<{ id: LegalTab; label: string; Icon: typeof MessageSquare }> = [
  { id: 'consulta', label: 'Consulta legal', Icon: MessageSquare },
  { id: 'redaccion', label: 'Redacción documentos', Icon: FileSignature },
  { id: 'plantillas', label: 'Plantillas', Icon: FileText },
  { id: 'auditoria', label: 'Auditoría legal', Icon: ShieldCheck },
];

export default function AdvisorView({
  causas,
  selectedCausa,
  selectedCausaId,
  isCausaDetailLoading,
  privacyMode,
  onSelectCausa,
}: AdvisorViewProps) {
  const [tab, setTab] = useState<LegalTab>('consulta');
  const legalTool: CaseLegalTool | null = tab === 'redaccion' || tab === 'auditoria' ? tab : null;
  const sortedCausas = useMemo(
    () =>
      [...causas].sort((left, right) =>
        `${left.estudianteNombre} ${left.id}`.localeCompare(
          `${right.estudianteNombre} ${right.id}`,
          'es-CL',
        ),
      ),
    [causas],
  );

  const needsCase = legalTool !== null;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero header - matches CausasView and StudentsPanel */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 font-semibold text-blue-200/80 text-xs uppercase tracking-wider">
              Convivencia Escolar · Herramientas Legales
            </p>
            <h2 className="font-bold text-2xl tracking-tight sm:text-3xl">Asistente Legal</h2>
            <p className="mt-2 text-blue-100/80 text-sm">
              Consulta normativa, redacta documentos y revisa el debido proceso con un expediente
              seleccionado.
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1"
        role="tablist"
        aria-label="Secciones del asistente legal"
      >
        {LEGAL_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 font-semibold text-xs transition-colors sm:px-4 ${
              tab === id
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {needsCase && (
        <section
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs"
          aria-label="Selección de expediente"
        >
          <label
            htmlFor="legal-case-selector"
            className="mb-1.5 block font-semibold text-[10px] text-neutral-500 uppercase tracking-wide"
          >
            Expediente para {tab === 'redaccion' ? 'redactar' : 'auditar'}
          </label>
          <select
            id="legal-case-selector"
            value={selectedCausaId}
            onChange={(event) => onSelectCausa(event.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white p-2.5 font-medium text-neutral-800 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="">Seleccione un expediente</option>
            {sortedCausas.map((causa) => (
              <option key={causa.id} value={causa.id}>
                {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre} ·{' '}
                {causa.estudianteCurso || 'Sin curso'} · {causa.id}
              </option>
            ))}
          </select>
          <p className="mt-2 text-neutral-500 text-xs">
            Esta herramienta usa únicamente los hitos, checklist, adjuntos y fuentes jurídicas
            autorizadas del expediente. Los antecedentes se cargan una vez y se conservan en caché
            durante la sesión.
          </p>
        </section>
      )}

      {tab === 'consulta' && <AiAdvisor />}

      {tab === 'plantillas' && (
        <section
          className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs"
          aria-label="Administración de plantillas"
        >
          <TemplateEditor />
        </section>
      )}

      {needsCase && !selectedCausaId && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <Gavel className="mx-auto size-7 text-brand-500" aria-hidden="true" />
          <h3 className="mt-3 font-semibold text-neutral-900">Seleccione un expediente</h3>
          <p className="mx-auto mt-1 max-w-md text-neutral-500 text-sm">
            Así la herramienta trabajará con antecedentes reales y no con información genérica.
          </p>
        </div>
      )}

      {needsCase && selectedCausaId && isCausaDetailLoading && (
        <div
          className="rounded-xl border border-neutral-200 bg-white p-8 text-center"
          role="status"
        >
          <p className="font-medium text-neutral-600 text-sm">
            Cargando antecedentes del expediente…
          </p>
        </div>
      )}

      {selectedCausa && !isCausaDetailLoading && (
        <CaseLegalWorkspace
          key={selectedCausa.id}
          causa={selectedCausa}
          activeTool={legalTool}
          privacyMode={privacyMode}
        />
      )}
    </div>
  );
}
