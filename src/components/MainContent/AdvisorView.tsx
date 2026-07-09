import { Sparkles } from 'lucide-react';
import AiAdvisor from '../AiAdvisor';
import PageHeader from '../PageHeader';

export default function AdvisorView() {
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
      <AiAdvisor />
    </div>
  );
}
