/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import type { Course, Student } from '../lib/supabase';
import type { Causa } from '../types';
import NewCausaForm from './NewCausaForm';

interface NewCausaModalProps {
  // Form field values
  newEstNombre: string;
  setNewEstNombre: (v: string) => void;
  newEstRut: string;
  setNewEstRut: (v: string) => void;
  newEstCurso: string;
  newInfTipo: Causa['tipoInfraccion'];
  setNewInfTipo: (v: Causa['tipoInfraccion']) => void;
  newAulaSegura: boolean;
  setNewAulaSegura: (v: boolean) => void;
  newObs: string;
  setNewObs: (v: string) => void;
  newResponsable: string;
  setNewResponsable: (v: string) => void;
  selectedCourseId: string;

  // Data
  courses: Course[];
  students: Student[];
  isLoadingCourses: boolean;
  isLoadingStudents: boolean;

  // Callbacks
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCourseChange: (courseId: string) => void;
  onStudentSelect: (studentId: string) => void;
}

export default function NewCausaModal({
  newEstNombre,
  setNewEstNombre,
  newEstRut,
  setNewEstRut,
  newEstCurso: _newEstCurso,
  newInfTipo,
  setNewInfTipo,
  newAulaSegura,
  setNewAulaSegura,
  newObs,
  setNewObs,
  newResponsable,
  setNewResponsable,
  selectedCourseId,
  courses,
  students,
  isLoadingCourses,
  isLoadingStudents,
  onClose,
  onSubmit,
  onCourseChange,
  onStudentSelect,
}: NewCausaModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.close();
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Nuevo expediente"
      aria-modal="true"
      className="p-0 m-auto border-none bg-transparent text-inherit no-backdrop z-50"
    >
      <div className="relative w-full max-w-[40rem] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-scale-in m-auto">
        <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-secondary-500" aria-hidden="true" />
        <NewCausaForm
          newEstNombre={newEstNombre}
          setNewEstNombre={setNewEstNombre}
          newEstRut={newEstRut}
          setNewEstRut={setNewEstRut}
          newInfTipo={newInfTipo}
          setNewInfTipo={setNewInfTipo}
          newAulaSegura={newAulaSegura}
          setNewAulaSegura={setNewAulaSegura}
          newObs={newObs}
          setNewObs={setNewObs}
          newResponsable={newResponsable}
          setNewResponsable={setNewResponsable}
          selectedCourseId={selectedCourseId}
          courses={courses}
          students={students}
          isLoadingCourses={isLoadingCourses}
          isLoadingStudents={isLoadingStudents}
          onClose={onClose}
          onSubmit={onSubmit}
          onCourseChange={onCourseChange}
          onStudentSelect={onStudentSelect}
        />
      </div>
    </dialog>
  );
}
