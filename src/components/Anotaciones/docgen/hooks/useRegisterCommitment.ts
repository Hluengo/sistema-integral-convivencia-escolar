import { useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';

interface RegisterCommitmentParams {
  student: {
    id: string;
    full_name: string;
    course_id: string;
  };
  docType: 'amonestacion' | 'compromiso_conductual' | 'derivacion';
  negativeCount: number;
  apoderadoName: string;
  coordinatorName: string;
  emittedBy: string;
  docObservations: string;
  compromisoStatus: string;
  teachers: Record<string, string>;
  onSuccess: (entry: {
    id: string;
    studentId: string;
    studentName: string;
    course: string;
    docType: string;
    emissionDate: string;
    status: string;
    apoderadoName: string;
  }) => void;
  setIsRegistering: (v: boolean) => void;
}

export function useRegisterCommitment() {
  const handleRegisterCommitment = useCallback(async (params: RegisterCommitmentParams) => {
    const {
      student,
      docType,
      negativeCount,
      apoderadoName,
      coordinatorName,
      emittedBy,
      docObservations,
      compromisoStatus,
      teachers,
      onSuccess,
      setIsRegistering,
    } = params;

    setIsRegistering(true);
    try {
      const { error } = await supabase.from('cartas_disciplinarias').insert({
        student_id: student.id,
        letter_type:
          docType === 'amonestacion'
            ? 'Amonestaci\u00f3n Escrita'
            : 'Carta de Compromiso Conductual',
        emission_date: new Date().toISOString().split('T')[0],
        status: compromisoStatus,
        emitted_by: emittedBy || 'Inspector\u00eda',
        supervisor_name: coordinatorName || null,
        apoderado_name: apoderadoName,
        annotations_count: negativeCount,
        student_name: student.full_name,
        course: student.course_id,
        regulation_basis:
          'RICE 2026 - Fundaci\u00f3n Educacional Colegio Carmela Romero de Espinosa',
        observations: docObservations || null,
      });

      if (!error) {
        const newEntry = {
          id: crypto.randomUUID(),
          studentId: student.id,
          studentName: student.full_name,
          course: student.course_id,
          docType,
          emissionDate: new Date().toISOString().split('T')[0],
          status: compromisoStatus,
          apoderadoName,
        };
        onSuccess(newEntry);
        alert('\u2705 Documento registrado exitosamente en cartas_disciplinarias.');
      } else {
        console.error('Error al registrar carta:', error);
        alert(`\u26a0\ufe0f Error al registrar el documento: ${error.message}`);
      }
    } catch (err) {
      console.error('Error en handleRegisterCommitment:', err);
      alert('\u26a0\ufe0f Ocurri\u00f3 un error inesperado. Intente nuevamente.');
    } finally {
      setIsRegistering(false);
    }
  }, []);

  return { handleRegisterCommitment };
}