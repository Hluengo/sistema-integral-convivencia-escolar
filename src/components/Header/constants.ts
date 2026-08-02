import type { SidebarView } from '../../widgets/sidebar/Sidebar';

export const VIEW_TITLES: Record<SidebarView, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Panel de control ejecutivo' },
  causas: { title: 'Causas', subtitle: 'Expedientes y procedimientos activos' },
  alumnos: { title: 'Estudiantes', subtitle: 'Gestión de estudiantes' },
  informes: { title: 'Asistente Legal', subtitle: 'Asistente y reportes' },
  reportes: { title: 'Centro de reportes', subtitle: 'Indicadores, filtros e historial' },
  anotaciones: { title: 'Gestión de Anotaciones', subtitle: 'Documentos y hojas de vida' },
  admin: { title: 'Administración', subtitle: 'Configuración y control del establecimiento' },
  platform: { title: 'Plataforma', subtitle: 'Gestión multi-colegio y superadministración' },
};
