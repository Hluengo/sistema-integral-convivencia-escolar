/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { Course, Student } from '../lib/supabase';
import type { Causa } from '../types';
import NewCausaForm from './NewCausaForm';
import { Dialog, DialogContent } from './ui/Dialog';

interface NewCausaModalProps {
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
  courses: Course[];
  students: Student[];
  isLoadingCourses: boolean;
  isLoadingStudents: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCourseChange: (courseId: string) => void;
  onStudentSelect: (studentId: string) => void;
}

export default function NewCausaModal(props: NewCausaModalProps) {
  const { onClose } = props;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[40rem] max-h-[90vh] overflow-y-auto p-0">
        <div className="absolute top-0 right-4 left-4 h-[3px] rounded-full bg-secondary-500" aria-hidden="true" />
        <NewCausaForm
          newEstNombre={props.newEstNombre}
          setNewEstNombre={props.setNewEstNombre}
          newEstRut={props.newEstRut}
          setNewEstRut={props.setNewEstRut}
          newInfTipo={props.newInfTipo}
          setNewInfTipo={props.setNewInfTipo}
          newAulaSegura={props.newAulaSegura}
          setNewAulaSegura={props.setNewAulaSegura}
          newObs={props.newObs}
          setNewObs={props.setNewObs}
          newResponsable={props.newResponsable}
          setNewResponsable={props.setNewResponsable}
          selectedCourseId={props.selectedCourseId}
          courses={props.courses}
          students={props.students}
          isLoadingCourses={props.isLoadingCourses}
          isLoadingStudents={props.isLoadingStudents}
          onClose={onClose}
          onSubmit={props.onSubmit}
          onCourseChange={props.onCourseChange}
          onStudentSelect={props.onStudentSelect}
        />
      </DialogContent>
    </Dialog>
  );
}
