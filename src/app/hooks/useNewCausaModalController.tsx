/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useCausasStore } from '../../shared/lib/stores/causasStore';
import { useNewCausaForm } from '../../shared/lib/hooks/useNewCausaForm';
import { useCoursesQuery } from '../../shared/lib/hooks/useCoursesQuery';
import { useStudentsQuery } from '../../shared/lib/hooks/useStudentsQuery';
import NewCausaModalBoundary from '../components/NewCausaModalBoundary';
import NewIncidenteModalBoundary from '../components/NewIncidenteModalBoundary';
import { createIncidente } from '../../shared/api/services/incidentes.service';
import type { CreateIncidenteInput } from '../../shared/api/services/incidentes.service';
import { useAuthStore } from '../../shared/lib/stores/authStore';
import { useToastStore } from '../../shared/lib/stores/toastStore';

type CreateIncidentFormInput = CreateIncidenteInput & { studentIds: string[] };

interface UseNewCausaModalControllerArgs {
  requireAuth: () => boolean;
  onOpened: () => void;
  onCreated: () => void;
}

export function useNewCausaModalController({
  requireAuth,
  onOpened,
  onCreated,
}: UseNewCausaModalControllerArgs) {
  const handleCreateCausaAction = useCausasStore((state) => state.handleCreateCausa);
  const {
    form,
    showCreateForm,
    openCreateForm: openForm,
    closeCreateForm,
    resetCreateForm,
    setCourse,
    setStudent,
  } = useNewCausaForm();
  const selectedCourseId = useWatch({ control: form.control, name: 'selectedCourseId' });
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupCourseId, setGroupCourseId] = useState('');

  const { data: courses = [], isLoading: isLoadingCourses } = useCoursesQuery();
  const { data: students = [], isLoading: isLoadingStudents } = useStudentsQuery(
    selectedCourseId ?? '',
  );
  const { data: groupStudents = [], isLoading: isLoadingGroupStudents } = useStudentsQuery(groupCourseId);
  const newEstCurso = courses.find((course) => course.id === selectedCourseId)?.name ?? '';

  const openCreateForm = useCallback(() => {
    if (!requireAuth()) return;
    openForm();
    onOpened();
  }, [onOpened, openForm, requireAuth]);

  const openGroupForm = useCallback(() => {
    if (!requireAuth()) return;
    setShowGroupForm(true);
    onOpened();
  }, [onOpened, requireAuth]);

  const closeGroupForm = useCallback(() => {
    setShowGroupForm(false);
    setGroupCourseId('');
  }, []);

  const toggleCreateForm = useCallback(() => {
    if (showCreateForm) {
      closeCreateForm();
      return;
    }
    openCreateForm();
  }, [closeCreateForm, openCreateForm, showCreateForm]);

  const handleStudentSelect = useCallback(
    (studentId: string) => {
      if (!studentId) {
        setStudent('', '', '');
        return;
      }
      const student = students.find((candidate) => candidate.id === studentId);
      if (student) {
        setStudent(student.id, student.full_name, student.rut);
      }
    },
    [setStudent, students],
  );

  const handleCreateCausa = form.handleSubmit(
    async ({
      selectedStudentId,
      newEstNombre,
      newEstRut,
      newInfTipo,
      conductaRiceId,
      newAulaSegura,
      newObs,
      newResponsable,
    }) => {
      if (!newEstCurso) {
        form.setError('selectedCourseId', {
          type: 'validate',
          message: 'Seleccione un curso disponible.',
        });
        return;
      }
      const result = await handleCreateCausaAction({
        studentId: selectedStudentId || undefined,
        newEstNombre,
        newEstRut,
        newEstCurso,
        newInfTipo,
        conductaRiceId,
        newAulaSegura,
        newObs,
        newResponsable,
      });
      if (result) {
        resetCreateForm();
        onCreated();
      }
    },
  );

  const handleCreateIncident = useCallback(
    async ({ lugar, descripcion, responsable, studentIds }: CreateIncidentFormInput) => {
      const tenantId = useAuthStore.getState().tenantId;
      const incident = await createIncidente({ lugar, descripcion, responsable }, tenantId);
      if (!incident) {
        throw new Error('No fue posible crear el incidente grupal.');
      }

      let created = 0;
      for (const studentId of studentIds) {
        const student = groupStudents.find((candidate) => candidate.id === studentId);
        if (!student) continue;
        const result = await handleCreateCausaAction({
          incidenteId: incident.id,
          studentId: student.id,
          newEstNombre: student.full_name,
          newEstRut: student.rut,
          newEstCurso: courses.find((course) => course.id === groupCourseId)?.name ?? '',
          newInfTipo: 'Gravísima',
          conductaRiceId: 'AS4',
          newAulaSegura: false,
          newObs: descripcion,
          newResponsable: responsable,
        });
        if (result) created += 1;
      }

      if (created === 0) {
        throw new Error('El incidente se creó, pero no se pudo crear ningún expediente.');
      }
      useToastStore
        .getState()
        .addToast(
          created === studentIds.length ? 'success' : 'warning',
          `Incidente grupal creado con ${created} de ${studentIds.length} expedientes.`,
        );
      closeGroupForm();
      onCreated();
    },
    [closeGroupForm, courses, groupCourseId, groupStudents, handleCreateCausaAction, onCreated],
  );

  const modal = showCreateForm ? (
    <NewCausaModalBoundary
      form={form}
      courses={courses}
      students={students}
      isLoadingCourses={isLoadingCourses}
      isLoadingStudents={isLoadingStudents}
      onClose={closeCreateForm}
      onSubmit={handleCreateCausa}
      onCourseChange={setCourse}
      onStudentSelect={handleStudentSelect}
    />
  ) : null;
  const groupModal = showGroupForm ? (
    <NewIncidenteModalBoundary
      courses={courses}
      students={groupStudents}
      selectedCourseId={groupCourseId}
      isLoadingStudents={isLoadingGroupStudents}
      onCourseChange={setGroupCourseId}
      onClose={closeGroupForm}
      onSubmit={handleCreateIncident}
    />
  ) : null;

  return {
    showCreateForm,
    openCreateForm,
    closeCreateForm,
    toggleCreateForm,
    openGroupForm,
    closeGroupForm,
    coursesCount: courses.length,
    modal: (
      <>
        {modal}
        {groupModal}
      </>
    ),
  };
}
