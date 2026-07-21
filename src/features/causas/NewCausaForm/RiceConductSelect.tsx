import { BookOpen } from 'lucide-react';
import { REGLAMENTO_CONDUCTAS } from '../../../reglamentoData';
import type { Causa } from '../../../types';

interface RiceConductSelectProps {
  setNewInfTipo: (value: Causa['tipoInfraccion']) => void;
  setNewAulaSegura: (value: boolean) => void;
  setNewObs: (value: string) => void;
  currentObs?: string;
}

export default function RiceConductSelect({
  setNewInfTipo,
  setNewAulaSegura,
  setNewObs,
  currentObs,
}: RiceConductSelectProps) {
  const conductasLeves = REGLAMENTO_CONDUCTAS.filter(conducta => conducta.gravedad === 'Leve');
  const conductasGraves = REGLAMENTO_CONDUCTAS.filter(conducta => conducta.gravedad === 'Grave');
  const conductasMuyGraves = REGLAMENTO_CONDUCTAS.filter(conducta => conducta.gravedad === 'Muy Grave');
  const conductasGravisimas = REGLAMENTO_CONDUCTAS.filter(conducta => conducta.gravedad === 'Gravísima');

  const applyConducta = (conductId: string) => {
    const matched = REGLAMENTO_CONDUCTAS.find(conducta => conducta.id === conductId);
    if (!matched) { return; }

    const riceObs = `Falta ${matched.gravedad} según el Reglamento del Colegio Carmela Romero. Artículo/Sección: ${matched.articulo} N° ${matched.numero}. Conducta: ${matched.conducta}\n\n[Medidas Formativas del RICE]:\n${matched.medidasFormativas.map(medida => ` - ${medida}`).join('\n')}\n\n[Medidas Disciplinarias del RICE]:\n${matched.medidasDisciplinarias.map(medida => ` - ${medida}`).join('\n')}`;

    const userConfirmed = !currentObs || currentObs.trim() === '' ||
      window.confirm('Ya has escrito observaciones manualmente. ¿Deseas reemplazarlas con los datos del RICE?');
    if (!userConfirmed) { return; }

    setNewInfTipo(matched.gravedad);
    setNewAulaSegura(matched.gravedad === 'Gravísima');
    setNewObs(riceObs);
  };

  return (
    <div>
      <label htmlFor="create-rice" className="block flex items-center gap-1.5 font-semibold text-neutral-500 text-xs uppercase tracking-wide">
        <BookOpen className="h-3 w-3 text-brand-600" aria-hidden="true" />
        Autocompletar desde Reglamento (RICE):
      </label>
      <select
        id="create-rice"
        onChange={(event) => applyConducta(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-brand-200 bg-brand-50/20 p-3 font-medium text-[11px] text-brand-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        defaultValue=""
      >
        <option value="" className="text-neutral-500">-- Seleccionar conducta --</option>
        <optgroup label="Faltas Leves (Art. 24)" className="bg-white font-semibold text-blue-900">
          {conductasLeves.map(conducta => (
            <option key={conducta.id} value={conducta.id} className="font-normal text-neutral-800">
              Leve N° {conducta.numero}: {conducta.conducta}
            </option>
          ))}
        </optgroup>
        <optgroup label="Faltas Graves (Art. 25)" className="bg-white font-semibold text-amber-800">
          {conductasGraves.map(conducta => (
            <option key={conducta.id} value={conducta.id} className="font-normal text-neutral-800">
              Grave N° {conducta.numero}: {conducta.conducta}
            </option>
          ))}
        </optgroup>
        <optgroup label="Faltas Muy Graves (Art. 26)" className="bg-white font-semibold text-purple-800">
          {conductasMuyGraves.map(conducta => (
            <option key={conducta.id} value={conducta.id} className="font-normal text-neutral-800">
              Muy Grave N° {conducta.numero}: {conducta.conducta}
            </option>
          ))}
        </optgroup>
        <optgroup label="Faltas Gravísimas (Aula Segura - Art. 27)" className="bg-white font-semibold text-red-800">
          {conductasGravisimas.map(conducta => (
            <option key={conducta.id} value={conducta.id} className="font-normal text-neutral-800">
              Gravísima N° {conducta.numero}: {conducta.conducta}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
