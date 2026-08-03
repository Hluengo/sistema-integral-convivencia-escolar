/** @license SPDX-License-Identifier: Apache-2.0 */

import type { SidebarView } from '../../widgets/sidebar/Sidebar';

export type ViewLoaderView = SidebarView | 'boot';

/**
 * Frases con chispa que rotan mientras se carga una vista o el splash inicial.
 * Sin datos personales: solo humor institucional para la barra de progreso.
 */
export const PHRASES: Record<ViewLoaderView, string[]> = {
  boot: [
    'Despertando al asistente legal…',
    'Cargando expedientes…',
    'Encendiendo la sala de convivencia…',
  ],
  dashboard: [
    'Contando anotaciones negativas…',
    'Revisando quién se portó mal hoy…',
    'Calculando cuántas cartas van a salir…',
  ],
  causas: [
    'Abriendo expedientes…',
    'Revisando plazos que no pueden esperar…',
    'Sacando la lupa de investigación…',
  ],
  anotaciones: [
    'Consultando el registro RICE…',
    'Clasificando severidad…',
    '¿Leve, Grave o Muy Grave? Decidiendo…',
  ],
  alumnos: ['Cargando fichas de estudiantes…', 'Llamando lista…', 'Ordenando cursos…'],
  informes: [
    'Poniendo al día al asistente legal…',
    'Afilando los lápices del borrador…',
    'Buscando el fundamento normativo…',
  ],
  reportes: ['Preparando el centro de reportes…', 'Ordenando los números…', 'Armando tablas…'],
  admin: [
    'Abriendo la sala de profesores…',
    'Cargando administración…',
    'Revisando configuraciones…',
  ],
  platform: [
    'Cargando la plataforma…',
    'Llamando a todos los colegios…',
    'Sincronizando establecimientos…',
  ],
};
