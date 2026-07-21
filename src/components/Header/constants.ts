import type { SidebarView } from '../Sidebar';

export const VIEW_TITLES: Record<SidebarView, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Panel de control ejecutivo' },
  causas: { title: 'Causas', subtitle: 'Expedientes y procedimientos activos' },
  alumnos: { title: 'Alumnos', subtitle: 'Gestión de estudiantes' },
  informes: { title: 'Asistente Legal', subtitle: 'Asistente y reportes' },
  anotaciones: { title: 'Gestión de Anotaciones', subtitle: 'Documentos y hojas de vida' },
  documentos: { title: 'Registros', subtitle: 'Hub de expedientes y documentos oficiales' },
};