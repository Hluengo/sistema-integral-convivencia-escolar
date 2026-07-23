import { useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { createCartaEvent } from '@/src/services/cartas.service';

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
  existingCartaId?: string;
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

function mapDocTypeToDbLetter(docType: RegisterCommitmentParams['docType']) {
  if (docType === 'amonestacion') return 'Amonestación Escrita';
  if (docType === 'derivacion') return 'Ficha de Derivación';
  return 'Carta de Compromiso Conductual';
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
      existingCartaId,
      onSuccess,
      setIsRegistering,
    } = params;

    setIsRegistering(true);
    try {
      const tenantId = useAuthStore.getState().tenantId;
      const emissionDate = new Date().toISOString().split('T')[0];
      const payload = {
        student_id: student.id,
        tenant_id: tenantId,
        letter_type: mapDocTypeToDbLetter(docType),
        emission_date: emissionDate,
        status: compromisoStatus,
        emitted_by: emittedBy || 'Inspectoría',
        supervisor_name: coordinatorName || null,
        apoderado_name: apoderadoName || 'Pendiente',
        annotations_count: negativeCount,
        student_name: student.full_name,
        course: student.course_id,
        regulation_basis:
          'RICE 2026 - Fundación Educacional Colegio Carmela Romero de Espinosa',
        observations: docObservations || null,
      };

      const result = existingCartaId
        ? await supabase
            .from('cartas_disciplinarias')
            .update(payload)
            .eq('id', existingCartaId)
            .select('id')
            .single()
        : await supabase
            .from('cartas_disciplinarias')
            .insert(payload)
            .select('id')
            .single();

      if (!result.error && result.data) {
        const cartaId = String(result.data.id);
        await createCartaEvent(cartaId, 'registered', 'Carta registrada desde generador de anotaciones', {
          docType,
          negativeCount,
        });
        onSuccess({
          id: cartaId,
          studentId: student.id,
          studentName: student.full_name,
          course: student.course_id,
          docType,
          emissionDate,
          status: compromisoStatus,
          apoderadoName,
        });
        alert('Documento registrado exitosamente en cartas_disciplinarias.');
      } else {
        console.error('Error al registrar carta:', result.error);
        alert(`Error al registrar el documento: ${result.error?.message || 'sin detalle'}`);
      }
    } catch (err) {
      console.error('Error en handleRegisterCommitment:', err);
      alert('Ocurrió un error inesperado. Intente nuevamente.');
    } finally {
      setIsRegistering(false);
    }
  }, []);

  return { handleRegisterCommitment };
}
