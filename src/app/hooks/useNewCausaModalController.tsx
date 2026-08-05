/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import { useCausasStore } from '../../shared/lib/stores/causasStore';
import { useNewCausaForm } from '../../shared/lib/hooks/useNewCausaForm';
import { useCoursesQuery } from '../../shared/lib/hooks/useCoursesQuery';
import { useStudentsQuery } from '../../shared/lib/hooks/useStudentsQuery';
import NewCausaModalBoundary from '../components/NewCausaModalBoundary';

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

  const { data: courses = [], isLoading: isLoadingCourses } = useCoursesQuery();
  const { data: students = [], isLoading: isLoadingStudents } = useStudentsQuery(
    selectedCourseId ?? '',
  );
  const newEstCurso = courses.find((course) => course.id === selectedCourseId)?.name ?? '';

  const openCreateForm = useCallback(() => {
    if (!requireAuth()) return;
    openForm();
    onOpened();
  }, [onOpened, openForm, requireAuth]);

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
    async ({ newEstNombre, newEstRut, newInfTipo, newAulaSegura, newObs, newResponsable }) => {
      if (!newEstCurso) {
        form.setError('selectedCourseId', {
          type: 'validate',
          message: 'Seleccione un curso disponible.',
        });
        return;
      }
      const result = await handleCreateCausaAction({
        newEstNombre,
        newEstRut,
        newEstCurso,
        newInfTipo,
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

  return {
    showCreateForm,
    openCreateForm,
    closeCreateForm,
    toggleCreateForm,
    coursesCount: courses.length,
    modal,
  };
}
