import { Sparkles, FileText, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import AiAdvisor from '../AiAdvisor';
import TemplateEditor from '../TemplateEditor';
import PageHeader from '../PageHeader';

export default function AdvisorView() {
  const [tab, setTab] = useState<'chat' | 'templates'>('chat');

  return (
    <div className="flex-1 max-w-3xl mx-auto space-y-4 animate-fade-in">
      <PageHeader
        title="Asistente Judicial"
        description="Redacta informes y fiscaliza plazos con apoyo de IA, configurada con las Circulares de la Superintendencia de Educación."
      />
      <div className="bg-brand-50/50 border border-brand-100 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-left">
        <Sparkles className="h-5 w-5 text-brand-600 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <h4 className="text-[11px] font-semibold text-neutral-900 uppercase tracking-wide">Asistente Judicial e Investigativo</h4>
          <p className="text-[10px] text-neutral-600 leading-relaxed mt-0.5">
            Utiliza modelos de lenguaje configurados con las Circulares vigentes de la Superintendencia de Educación Chilena. Puede redactar informes, pautas, absolver dudas y fiscalizar plazos de Aula Segura.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200/60">
        <button
          onClick={() => setTab('chat')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-semibold transition-colors border-b-2 -mb-px ${
            tab === 'chat'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Consulta Legal
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-semibold transition-colors border-b-2 -mb-px ${
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
