/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { Course, Student } from '../../../shared/api/services/courses.service';
import type { NewCausaFormValues } from '../../../shared/lib/schemas/newCausaForm';
import NewCausaForm from './NewCausaForm';
import { Dialog, DialogContent } from '../../../shared/ui/Dialog';

interface NewCausaModalProps {
  form: UseFormReturn<NewCausaFormValues>;
  courses: Course[];
  students: Student[];
  isLoadingCourses: boolean;
  isLoadingStudents: boolean;
  onClose: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onCourseChange: (courseId: string) => void;
  onStudentSelect: (studentId: string) => void;
}

export default function NewCausaModal(props: NewCausaModalProps) {
  const { onClose } = props;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        hideClose
        className="max-h-[calc(100vh-1rem)] max-w-[48rem] overflow-y-auto p-6 sm:p-8 sm:max-h-[90vh]"
      >
        <div
          className="absolute top-0 right-4 left-4 h-[3px] rounded-full bg-secondary-500"
          aria-hidden="true"
        />
        <NewCausaForm
          form={props.form}
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
