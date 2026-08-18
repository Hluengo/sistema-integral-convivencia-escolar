/** @license SPDX-License-Identifier: Apache-2.0 */
import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { REGLAMENTO_CONDUCTAS } from '../../../reglamentoData';
import type { Causa } from '../../../shared/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogIcon,
  AlertDialogTitle,
} from '@/shared/ui/AlertDialog';
import Select from '@/shared/ui/Select';

interface RiceConductSelectProps {
  setNewInfTipo: (value: Causa['tipoInfraccion']) => void;
  setConductaRiceId: (value: string) => void;
  setNewAulaSegura: (value: boolean) => void;
  setNewObs: (value: string) => void;
  currentObs?: string;
}

type RiceConducta = (typeof REGLAMENTO_CONDUCTAS)[number];

function buildRiceObservation(matched: RiceConducta): string {
  return `Falta ${matched.gravedad} según el Reglamento del Colegio Carmela Romero. Artículo/Sección: ${matched.articulo} N° ${matched.numero}. Conducta: ${matched.conducta}\n\n[Medidas Formativas del RICE]:\n${matched.medidasFormativas.map((medida) => ` - ${medida}`).join('\n')}\n\n[Medidas Disciplinarias del RICE]:\n${matched.medidasDisciplinarias.map((medida) => ` - ${medida}`).join('\n')}`;
}

export default function RiceConductSelect({
  setNewInfTipo,
  setConductaRiceId,
  setNewAulaSegura,
  setNewObs,
  currentObs,
}: RiceConductSelectProps) {
  const [pendingConductId, setPendingConductId] = useState<string | null>(null);
  const conductasLeves = REGLAMENTO_CONDUCTAS.filter((conducta) => conducta.gravedad === 'Leve');
  const conductasGraves = REGLAMENTO_CONDUCTAS.filter((conducta) => conducta.gravedad === 'Grave');
  const conductasMuyGraves = REGLAMENTO_CONDUCTAS.filter(
    (conducta) => conducta.gravedad === 'Muy Grave',
  );
  const conductasGravisimas = REGLAMENTO_CONDUCTAS.filter(
    (conducta) => conducta.gravedad === 'Gravísima',
  );

  const applyConducta = (conductId: string) => {
    const matched = REGLAMENTO_CONDUCTAS.find((conducta) => conducta.id === conductId);
    if (!matched) {
      setConductaRiceId('');
      return;
    }

    const hasManualObservation = currentObs && currentObs.trim() !== '';
    if (hasManualObservation) {
      setPendingConductId(conductId);
      return;
    }

    setNewInfTipo(matched.gravedad);
    setConductaRiceId(matched.id);
    setNewAulaSegura(matched.gravedad === 'Gravísima');
    setNewObs(buildRiceObservation(matched));
  };

  const confirmReplacement = () => {
    if (!pendingConductId) return;
    const matched = REGLAMENTO_CONDUCTAS.find((conducta) => conducta.id === pendingConductId);
    if (!matched) return;
    setNewInfTipo(matched.gravedad);
    setConductaRiceId(matched.id);
    setNewAulaSegura(matched.gravedad === 'Gravísima');
    setNewObs(buildRiceObservation(matched));
    setPendingConductId(null);
  };

  return (
    <div>
      <label
        htmlFor="create-rice"
        className="block flex items-center gap-1.5 font-semibold text-neutral-500 text-xs uppercase"
      >
        <BookOpen className="h-3 w-3 text-brand-600" aria-hidden="true" />
        Autocompletar desde Reglamento (RICE):
      </label>
      <Select
        id="create-rice"
        onChange={(event) => applyConducta(event.target.value)}
        className="mt-1.5 border-brand-200 bg-brand-50/20 p-3 font-medium text-11px text-brand-900"
        defaultValue=""
      >
        <option value="" className="text-neutral-500">
          -- Seleccionar conducta --
        </option>
        <optgroup label="Faltas Leves (Art. 24)" className="bg-white font-semibold text-leve-700">
          {conductasLeves.map((conducta) => (
            <option key={conducta.id} value={conducta.id} className="font-normal text-neutral-800">
              Leve N° {conducta.numero}: {conducta.conducta}
            </option>
          ))}
        </optgroup>
        <optgroup label="Faltas Graves (Art. 25)" className="bg-white font-semibold text-grave-700">
          {conductasGraves.map((conducta) => (
            <option key={conducta.id} value={conducta.id} className="font-normal text-neutral-800">
              Grave N° {conducta.numero}: {conducta.conducta}
            </option>
          ))}
        </optgroup>
        <optgroup
          label="Faltas Muy Graves (Art. 26)"
          className="bg-white font-semibold text-muygrave-700"
        >
          {conductasMuyGraves.map((conducta) => (
            <option key={conducta.id} value={conducta.id} className="font-normal text-neutral-800">
              Muy Grave N° {conducta.numero}: {conducta.conducta}
            </option>
          ))}
        </optgroup>
        <optgroup
          label="Faltas Gravísimas (Aula Segura - Art. 27)"
          className="bg-white font-semibold text-gravisima-700"
        >
          {conductasGravisimas.map((conducta) => (
            <option key={conducta.id} value={conducta.id} className="font-normal text-neutral-800">
              Gravísima N° {conducta.numero}: {conducta.conducta}
            </option>
          ))}
        </optgroup>
      </Select>
      <AlertDialog open={pendingConductId !== null} onOpenChange={() => setPendingConductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogIcon />
            <AlertDialogTitle>Reemplazar observaciones</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Ya existen observaciones manuales. Si continúa, se reemplazarán por los antecedentes del
            RICE seleccionado.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingConductId(null)}>
              Conservar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReplacement}
              className="bg-brand-700 hover:bg-brand-800"
            >
              Reemplazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
