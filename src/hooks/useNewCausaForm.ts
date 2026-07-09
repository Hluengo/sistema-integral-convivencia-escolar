/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useReducer } from 'react';
import { Causa } from '../types';

export interface FormState {
  showCreateForm: boolean;
  newEstNombre: string;
  selectedCourseId: string;
  newEstRut: string;
  newInfTipo: Causa['tipoInfraccion'];
  newAulaSegura: boolean;
  newObs: string;
  newResponsable: string;
}

export type FormAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'SET_COURSE'; courseId: string }
  | { type: 'SET_STUDENT'; nombre: string; rut: string }
  | { type: 'SET_FIELD'; field: keyof Omit<FormState, 'showCreateForm' | 'selectedCourseId'>; value: string | boolean }
  | { type: 'RESET' };

const FORM_INITIAL: FormState = {
  showCreateForm: false,
  newEstNombre: '',
  selectedCourseId: '',
  newEstRut: '',
  newInfTipo: 'Grave',
  newAulaSegura: false,
  newObs: '',
  newResponsable: 'Esteban Valenzuela (Encargado de Convivencia)',
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'OPEN':  return { ...state, showCreateForm: true };
    case 'CLOSE': return { ...state, showCreateForm: false };
    case 'SET_COURSE':
      return { ...state, selectedCourseId: action.courseId, newEstNombre: '', newEstRut: '' };
    case 'SET_STUDENT':
      return { ...state, newEstNombre: action.nombre, newEstRut: action.rut };
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return { ...FORM_INITIAL, showCreateForm: false };
    default:
      return state;
  }
}

export function useNewCausaForm() {
  const [formState, dispatchForm] = useReducer(formReducer, FORM_INITIAL);
  return { formState, dispatchForm };
}
