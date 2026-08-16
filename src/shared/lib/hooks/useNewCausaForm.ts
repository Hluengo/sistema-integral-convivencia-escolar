/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FieldErrors, Resolver } from 'react-hook-form';
import { newCausaFormSchema, type NewCausaFormValues } from '../schemas/newCausaForm';

export const NEW_CAUSA_FORM_DEFAULTS: NewCausaFormValues = {
  selectedCourseId: '',
  selectedStudentId: '',
  newEstNombre: '',
  newEstRut: '',
  newInfTipo: 'Grave',
  newAulaSegura: false,
  newObs: '',
  newResponsable: 'Esteban Valenzuela (Encargado de Convivencia)',
};

const NEW_CAUSA_FORM_FIELDS = Object.keys(NEW_CAUSA_FORM_DEFAULTS) as Array<
  keyof NewCausaFormValues
>;

function isNewCausaFormField(field: unknown): field is keyof NewCausaFormValues {
  return (
    typeof field === 'string' && NEW_CAUSA_FORM_FIELDS.includes(field as keyof NewCausaFormValues)
  );
}

export const newCausaFormResolver: Resolver<NewCausaFormValues> = async (values) => {
  const result = newCausaFormSchema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }

  const errors: FieldErrors<NewCausaFormValues> = {};
  for (const issue of result.error.issues) {
    const [field] = issue.path;
    if (isNewCausaFormField(field) && !errors[field]) {
      errors[field] = {
        type: issue.code,
        message: issue.message,
      };
    }
  }

  return { values: {}, errors };
};

export function useNewCausaForm() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const form = useForm<NewCausaFormValues>({
    defaultValues: NEW_CAUSA_FORM_DEFAULTS,
    mode: 'onChange',
    resolver: newCausaFormResolver,
  });
  const { reset, setValue } = form;

  const openCreateForm = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const closeCreateForm = useCallback(() => {
    setShowCreateForm(false);
  }, []);

  const resetCreateForm = useCallback(() => {
    reset(NEW_CAUSA_FORM_DEFAULTS);
    setShowCreateForm(false);
  }, [reset]);

  const setCourse = useCallback(
    (courseId: string) => {
      setValue('selectedCourseId', courseId, { shouldDirty: true, shouldValidate: true });
      setValue('selectedStudentId', '', { shouldDirty: true });
      setValue('newEstNombre', '', { shouldDirty: true, shouldValidate: true });
      setValue('newEstRut', '', { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const setStudent = useCallback(
    (studentId: string, nombre: string, rut: string) => {
      setValue('selectedStudentId', studentId, { shouldDirty: true, shouldValidate: true });
      setValue('newEstNombre', nombre, { shouldDirty: true, shouldValidate: true });
      setValue('newEstRut', rut, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  return {
    form,
    showCreateForm,
    openCreateForm,
    closeCreateForm,
    resetCreateForm,
    setCourse,
    setStudent,
  };
}
