import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { fetchCartas } from '@/src/services/cartas.service';
import { fetchEtapas } from '@/src/services/etapas.service';
import type { DisciplinayRecord } from '../constants';
import type { CartaDisciplinaria } from '@/src/shared/lib/types';

interface DisciplinaryDataResult {
  isDataLoading: boolean;
  activeCase: DisciplinayRecord | null;
  etapas: DisciplinayRecord[];
  currentMeasure: string;
  transitions: DisciplinayRecord[];
  cartas: CartaDisciplinaria[];
  setCurrentMeasure: (v: string) => void;
  setTransitions: (v: DisciplinayRecord[]) => void;
}

export function useDisciplinaryData(
  studentId: string,
  studentFullName: string
): DisciplinaryDataResult {
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [activeCase, setActiveCase] = useState<DisciplinayRecord | null>(null);
  const [etapas, setEtapas] = useState<DisciplinayRecord[]>([]);
  const [currentMeasure, setCurrentMeasure] = useState('');
  const [transitions, setTransitions] = useState<DisciplinayRecord[]>([]);
  const [cartas, setCartas] = useState<CartaDisciplinaria[]>([]);
  const cartasRef = useRef<unknown[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsDataLoading(true);
      try {
        const [cartasData, etapasData, causasResult] = await Promise.all([
          fetchCartas(studentId),
          fetchEtapas(studentId),
          supabase
            .from('causas')
            .select('id,estado_actual,tipo_infraccion,fecha_ultima_actualizacion')
            .eq('estudiante_nombre', studentFullName)
            .order('fecha_ultima_actualizacion', { ascending: false })
            .limit(1),
        ]);

        if (cancelled) return;

        cartasRef.current = cartasData;
        setCartas(cartasData as CartaDisciplinaria[]);
        setEtapas(etapasData);

        if (causasResult.data && causasResult.data.length > 0) {
          setActiveCase(causasResult.data[0] as DisciplinayRecord);
        }

        const measureKey = `disciplinary_measure_${studentId}`;
        const transitionsKey = `disciplinary_transitions_${studentId}`;
        const storedMeasure = localStorage.getItem(measureKey);
        const storedTransitions = localStorage.getItem(transitionsKey);

        if (storedMeasure) setCurrentMeasure(storedMeasure);
        if (storedTransitions) {
          try { setTransitions(JSON.parse(storedTransitions)); } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('Error loading disciplinary data:', err);
      } finally {
        if (!cancelled) {
          setIsDataLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [studentId, studentFullName]);

  return {
    isDataLoading,
    activeCase,
    etapas,
    currentMeasure,
    transitions,
    cartas,
    setCurrentMeasure,
    setTransitions,
  };
}