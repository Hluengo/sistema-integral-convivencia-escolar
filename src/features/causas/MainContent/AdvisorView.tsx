import { useState } from 'react';
import { Sparkles, FileText, MessageSquare } from 'lucide-react';
import AiAdvisor from '../../../components/AiAdvisor';
import TemplateEditor from '../../../components/TemplateEditor';

export default function AdvisorView() {
  const [tab, setTab] = useState<'chat' | 'templates'>('chat');

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero header - matches CausasView and StudentsPanel */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 font-semibold text-blue-200/80 text-xs uppercase tracking-wider">
              Informes · Asistencia Legal
            </p>
            <h2 className="font-bold text-2xl tracking-tight sm:text-3xl">Asistente Legal</h2>
            <p className="mt-2 text-blue-100/80 text-sm">
              Redacta informes y fiscaliza plazos con apoyo de IA
            </p>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3.5 text-left sm:p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        <div>
          <h4 className="font-semibold text-[11px] text-neutral-900 uppercase tracking-wide">Asistente Judicial e Investigativo</h4>
          <p className="mt-0.5 text-[10px] text-neutral-600 leading-relaxed">
            Utiliza modelos de lenguaje configurados con las Circulares vigentes de la Superintendencia de Educación Chilena. Puede redactar informes, pautas, absolver dudas y fiscalizar plazos de Aula Segura.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-neutral-200/60 border-b">
        <button
          type="button"
          onClick={() => setTab('chat')}
          className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-semibold text-[10px] transition-colors ${
            tab === 'chat'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Consulta Legal
        </button>
        <button
          type="button"
          onClick={() => setTab('templates')}
          className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-semibold text-[10px] transition-colors ${
            tab === 'templates'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Plantillas
        </button>
      </div>

      {/* Content */}
      {tab === 'chat' ? <AiAdvisor /> : <TemplateEditor onBack={() => setTab('chat')} />}
    </div>
  );
}