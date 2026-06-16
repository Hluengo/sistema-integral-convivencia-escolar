/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Causa, EstadoCausa, ChecklistItem, Statistics } from './types';

// Helper to calculate relative dates from current time (2026-05-27)
const relativeDate = (daysAgo: number): string => {
  const date = new Date('2026-05-27T14:50:29Z');
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
 };

const relativeDateTime = (daysAgo: number, timeStr: string): string => {
  const dStr = relativeDate(daysAgo);
  return `${dStr}T${timeStr}:00Z`;
};

export const MAPPED_STATES: Record<EstadoCausa, { fase: 'Recepción' | 'Investigación' | 'Resolución' | 'Impugnación' | 'Seguimiento'; desc: string }> = {
  [EstadoCausa.DENUNCIA_RECEPCIONADA]: { fase: 'Recepción', desc: 'Se recibe formalmente el reporte, denuncia o antecedente inicial.' },
  [EstadoCausa.ANTECEDENTES_REVISION_INICIAL]: { fase: 'Recepción', desc: 'Se realiza acopio preliminar de información y verificación básica de los hechos.' },
  [EstadoCausa.INICIO_INDAGACION_NOTIFICADO]: { fase: 'Recepción', desc: 'Se informa formalmente al apoderado sobre la apertura del procedimiento disciplinario dentro de plazo reglamentario.' },

  [EstadoCausa.EN_PROCESO_INDAGACION]: { fase: 'Investigación', desc: 'Investigación activa mediante entrevistas, revisión documental y recopilación de evidencias.' },
  [EstadoCausa.RECOPILACION_EVIDENCIAS_CURSO]: { fase: 'Investigación', desc: 'Estado intermedio para investigaciones complejas o extensas.' },
  [EstadoCausa.DERIVADO_A_MEDIACION]: { fase: 'Investigación', desc: 'El caso es abordado mediante estrategia alternativa/restaurativa autorizada reglamentariamente.' },
  [EstadoCausa.MEDIACION_EN_DESARROLLO]: { fase: 'Investigación', desc: 'Las partes participan activamente en proceso de resolución colaborativa.' },
  [EstadoCausa.MEDIACION_CERRADA_ACUERDO]: { fase: 'Investigación', desc: 'Se logra acuerdo restaurativo y se suspende o cierra el proceso disciplinario.' },
  [EstadoCausa.MEDIACION_FRACASADA_RETORNO]: { fase: 'Investigación', desc: 'No existe acuerdo o no se cumplen condiciones para mediación.' },

  [EstadoCausa.INFORME_CONCLUYENTE_ELABORACION]: { fase: 'Resolución', desc: 'El Encargado de Convivencia sistematiza antecedentes y redacta conclusiones.' },
  [EstadoCausa.INFORME_CONCLUYENTE_EMITIDO]: { fase: 'Resolución', desc: 'El informe técnico fue entregado a Dirección/Rectoría para resolución.' },
  [EstadoCausa.ENTREVISTA_DISCIPLINARIA_PENDIENTE]: { fase: 'Resolución', desc: 'Citación realizada a estudiante y apoderado para presentación de hallazgos.' },
  [EstadoCausa.ENTREVISTA_DISCIPLINARIA_REALIZADA]: { fase: 'Resolución', desc: 'Se efectuó audiencia disciplinaria y ejercicio del derecho a ser oído.' },
  [EstadoCausa.RESOLUCION_ELABORACION]: { fase: 'Resolución', desc: 'Rectoría o Dirección se encuentra determinando medida disciplinaria.' },
  [EstadoCausa.RESOLUCION_FINAL_NOTIFICADA]: { fase: 'Resolución', desc: 'Se entrega formalmente resolución disciplinaria al apoderado.' },

  [EstadoCausa.EN_PLAZO_APELACION]: { fase: 'Impugnación', desc: 'Se encuentra vigente el periodo reglamentario para presentar recurso de reconsideración.' },
  [EstadoCausa.APELACION_RECEPCIONADA]: { fase: 'Impugnación', desc: 'Se recibe formalmente recurso de reconsideración o apelación.' },
  [EstadoCausa.APELACION_REVISION_RECTORIA]: { fase: 'Impugnación', desc: 'Autoridad competente analiza antecedentes y emite resolución definitiva.' },
  [EstadoCausa.APELACION_RESUELTA]: { fase: 'Impugnación', desc: 'Se confirma, modifica o revoca la medida inicialmente aplicada.' },
  [EstadoCausa.RESOLUCION_EJECUTORIADA]: { fase: 'Impugnación', desc: 'Finaliza completamente el debido proceso administrativo interno.' },

  [EstadoCausa.MEDIDA_EJECUCION]: { fase: 'Seguimiento', desc: 'Se encuentra vigente la aplicación de medidas formativas o disciplinarias.' },
  [EstadoCausa.PROCESO_SEGUIMIENTO]: { fase: 'Seguimiento', desc: 'Se monitorea cumplimiento, conducta y evolución del estudiante.' },
  [EstadoCausa.SEGUIMIENTO_FINALIZADO]: { fase: 'Seguimiento', desc: 'Se concluye etapa de acompañamiento institucional.' },
  [EstadoCausa.CAUSA_CERRADA]: { fase: 'Seguimiento', desc: 'Procedimiento completamente finalizado y archivado.' },
};

export const FASES_LIST: { name: 'Recepción' | 'Investigación' | 'Resolución' | 'Impugnación' | 'Seguimiento'; color: string; bg: string; border: string }[] = [
  { name: 'Recepción', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { name: 'Investigación', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { name: 'Resolución', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { name: 'Impugnación', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { name: 'Seguimiento', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' }
];

export const getFaseForEstado = (estado: EstadoCausa) => {
  return MAPPED_STATES[estado]?.fase || 'Recepción';
};

export const getBaseChecklist = (): ChecklistItem[] => [
  // 1. Recepción y Apertura (chk_rec_1, chk_rec_2, chk_rec_3)
  {
    id: 'chk_rec_1',
    label: 'Denuncia Recepcionada',
    descripcion: 'Se recibe formalmente el reporte, denuncia o antecedente inicial.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_rec_2',
    label: 'Antecedentes en Revisión Inicial',
    descripcion: 'Se realiza acopio preliminar de información y verificación básica de los hechos.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_rec_3',
    label: 'Inicio de Indagación Notificado',
    descripcion: 'Se informa formalmente al apoderado sobre la apertura del procedimiento disciplinario dentro de plazo reglamentario.',
    completado: false,
    requeridoPor: 'Circular 482'
  },

  // 2. Estado de Investigación (chk_inv_1 a chk_inv_6)
  {
    id: 'chk_inv_1',
    label: 'En Proceso de Indagación',
    descripcion: 'Investigación activa mediante interviews, revisión documental y recopilación de evidencias.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_inv_2',
    label: 'Recopilación de Evidencias en Curso',
    descripcion: 'Estado intermedio para investigaciones complejas o extensas.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_inv_3',
    label: 'Derivado a Mediación',
    descripcion: 'El caso es abordado mediante estrategia alternativa/restaurativa autorizada reglamentariamente.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_inv_4',
    label: 'Mediación en Desarrollo',
    descripcion: 'Las partes participan activamente en proceso de resolución colaborativa.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_inv_5',
    label: 'Mediación Cerrada con Acuerdo',
    descripcion: 'Se logra acuerdo restaurativo y se suspende o cierra el proceso disciplinario.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_inv_6',
    label: 'Mediación Fracasada – Retorno a Indagación',
    descripcion: 'No existe acuerdo o no se cumplen condiciones para mediación.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },

  // 3. Estado de Análisis y Resolución (chk_res_1 a chk_res_6)
  {
    id: 'chk_res_1',
    label: 'Informe Concluyente en Elaboración',
    descripcion: 'El Encargado de Convivencia sistematiza antecedentes y redacta conclusiones.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_res_2',
    label: 'Informe Concluyente Emitido',
    descripcion: 'El informe técnico fue entregado a Dirección/Rectoría para resolución.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_res_3',
    label: 'Entrevista Disciplinaria Pendiente',
    descripcion: 'Citación realizada a estudiante y apoderado para presentación de hallazgos.',
    completado: false,
    requeridoPor: 'Ambas'
  },
  {
    id: 'chk_res_4',
    label: 'Entrevista Disciplinaria Realizada',
    descripcion: 'Se efectuó audiencia disciplinaria y ejercicio del derecho a ser oído.',
    completado: false,
    requeridoPor: 'Ambas'
  },
  {
    id: 'chk_res_5',
    label: 'Resolución en Elaboración',
    descripcion: 'Rectoría o Dirección se encuentra determinando medida disciplinaria.',
    completado: false,
    requeridoPor: 'Ambas'
  },
  {
    id: 'chk_res_6',
    label: 'Resolución Final Notificada',
    descripcion: 'Se entrega formalmente resolución disciplinaria al apoderado.',
    completado: false,
    requeridoPor: 'Ambas'
  },

  // 4. Estado de Impugnación (chk_imp_1 a chk_imp_5)
  {
    id: 'chk_imp_1',
    label: 'En Plazo de Apelación',
    descripcion: 'Se encuentra vigente el periodo reglamentario para presentar recurso de reconsideración.',
    completado: false,
    requeridoPor: 'Ley 21809'
  },
  {
    id: 'chk_imp_2',
    label: 'Apelación Recepcionada',
    descripcion: 'Se recibe formalmente recurso de reconsideración o apelación.',
    completado: false,
    requeridoPor: 'Ley 21809'
  },
  {
    id: 'chk_imp_3',
    label: 'Apelación en Revisión por Rectoría',
    descripcion: 'Autoridad competente analiza antecedentes y emite resolución definitiva.',
    completado: false,
    requeridoPor: 'Ley 21809'
  },
  {
    id: 'chk_imp_4',
    label: 'Apelación Resuelta',
    descripcion: 'Se confirma, modifica o revoca la medida inicialmente aplicada.',
    completado: false,
    requeridoPor: 'Ley 21809'
  },
  {
    id: 'chk_imp_5',
    label: 'Resolución Ejecutoriada',
    descripcion: 'Finaliza completamente el debido proceso administrativo interno.',
    completado: false,
    requeridoPor: 'Ley 21809'
  },

  // 5. Estado de Seguimiento (chk_seg_1 a chk_seg_4)
  {
    id: 'chk_seg_1',
    label: 'Medida en Ejecución',
    descripcion: 'Se encuentra vigente la aplicación de medidas formativas o disciplinarias.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_seg_2',
    label: 'En Proceso de Seguimiento',
    descripcion: 'Se monitorea cumplimiento, conducta y evolución del estudiante.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_seg_3',
    label: 'Seguimiento Finalizado',
    descripcion: 'Se concluye etapa de acompañamiento institucional.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_seg_4',
    label: 'Causa Cerrada',
    descripcion: 'Procedimiento completamente finalizado y archivado.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  }
];

const buildChecklistForCausa = (
  completedItems: { id: string; registradoPor?: string; observaciones?: string; documentoNombre?: string; fechaCompletado?: string }[]
): ChecklistItem[] => {
  return getBaseChecklist().map(baseItem => {
    const override = completedItems.find(o => o.id === baseItem.id);
    if (override) {
      return {
        ...baseItem,
        completado: true,
        fechaCompletado: override.fechaCompletado || relativeDate(5),
        registradoPor: override.registradoPor || 'Esteban Valenzuela',
        observaciones: override.observaciones || 'Hito procesal cerrado conforme a debido proceso.',
        documentoNombre: override.documentoNombre,
        documentoUrl: override.documentoNombre ? '#' : undefined
      };
    }
    return baseItem;
  });
};

export const INITIAL_CAUSAS: Causa[] = [
  {
    id: "DC-2026-014",
    estudianteNombre: "Sofía Valentina Rojas Pérez",
    estudianteCurso: "I° Medio B",
    nnaProtectedName: "S. V. R. P.",
    runEstudiante: "24.112.554-K",
    fechaApertura: relativeDate(8), // 2026-05-19
    estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
    tipoInfraccion: 'Muy Grave',
    responsable: "Esteban Valenzuela (Encargado de Convivencia)",
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: relativeDate(1), // 2026-05-26
    observaciones: "Cyberbullying reiterado en grupos de WhatsApp de curso. Se detectó difusión de imágenes manipuladas por IA sin consentimiento de la víctima.",
    checklistDebidoProceso: buildChecklistForCausa([
      { id: 'chk_rec_1', registradoPor: 'Esteban Valenzuela', observaciones: 'Denuncia por escrito y capturas de chat ingresadas formalmente por el apoderado.', documentoNombre: 'Formulario_Denuncia_SofíaRojas.pdf', fechaCompletado: relativeDate(8) },
      { id: 'chk_rec_2', registradoPor: 'Esteban Valenzuela', observaciones: 'Caso declarado admisible y derivado a revisión inicial de antecedentes.', fechaCompletado: relativeDate(8) },
      { id: 'chk_rec_3', registradoPor: 'Esteban Valenzuela', observaciones: 'Enviada carta certificada y copia digital notificando el inicio formal de indagación.', documentoNombre: 'Notificación_Apertura_Firmada.pdf', fechaCompletado: relativeDate(7) },
      { id: 'chk_inv_1', registradoPor: 'Esteban Valenzuela', observaciones: 'Apertura formal de la fase indagatoria e identificación de resguardos cautelares.', documentoNombre: 'Acta_Medidas_Resguardo.pdf', fechaCompletado: relativeDate(7) }
    ]),
    conductaRiceId: "MG11",
    medidasEjecutadas: [
      "formativa:Plan de Intervención Personalizado (PIP): objetivos, acompañamiento psicosocial y plazos",
      "formativa:Acompañamiento Psicosocial de intervención"
    ],
    bitacora: [
      {
        id: "b_1",
        fecha: relativeDateTime(8, "09:15"),
        tipo: 'Otro',
        titulo: "Recepción de denuncia escrita por Madre de la Afectada",
        descripcion: "La madre asiste en horario presencial y presenta impresiones de captura de pantalla con insultos denigrantes de índole sexista dirigidos hacia su pupila en un chat de WhatsApp de carácter grupal del curso I° Medio B.",
        participantes: ["Apoderada de Víctima", "Esteban Valenzuela"]
      },
      {
        id: "b_2",
        fecha: relativeDateTime(8, "11:30"),
        tipo: 'Evidencia',
        titulo: "Activación inmediata de medidas de resguardo",
        descripcion: "Se determina la ubicación provisional de puestos separados en la sala de clases, prohibición de acercamiento recíproco en recreos, y designación de tutor docente de apoyo para la estudiante afectada.",
        participantes: ["S. V. R. P.", "Tutor Docente", "Psicólogo de Apoyo"]
      },
      {
        id: "b_3",
        fecha: relativeDateTime(7, "08:30"),
        tipo: 'Notificación',
        titulo: "Notificación de apertura e inicio de investigación a apoderados",
        descripcion: "Se despacha correo formal certificado y se realiza llamada telefónica informativa al apoderado de Sofía, comunicándole el inicio del procedimiento de investigación reglamentario correspondiente.",
        participantes: ["Apoderado de Sofía R.", "Esteban Valenzuela"]
      },
      {
        id: "b_4",
        fecha: relativeDateTime(3, "10:00"),
        tipo: 'Entrevista',
        titulo: "Entrevista a Estudiante Testigo (Iniciales M.J.C.)",
        descripcion: "Se toma declaración a estudiante del curso en presencia de testigo institucional (Psicopedagoga). Confirma la procedencia del material ofensivo compartido en el grupo de curso.",
        participantes: ["Estudiante Testigo M.J.C.", "Esteban Valenzuela", "Patricia Soto (Testigo de fe)"]
      }
    ]
  },
  {
    id: "DC-2026-011",
    estudianteNombre: "Benjamín Andrés Muñoz Silva",
    estudianteCurso: "IV° Medio C",
    nnaProtectedName: "B. A. M. S.",
    runEstudiante: "22.356.128-4",
    fechaApertura: relativeDate(14), // 2026-05-13
    estadoActual: EstadoCausa.ENTREVISTA_DISCIPLINARIA_PENDIENTE,
    tipoInfraccion: 'Gravísima',
    responsable: "Esteban Valenzuela (Encargado de Convivencia)",
    comprometeAulaSegura: true, // Aula Segura tiene plazos fatales extremadamente rigurosos (10 días)
    fechaUltimaActualizacion: relativeDate(2), // 2026-05-25
    observaciones: "Agresión física grave dirigida a Inspector General dentro del establecimiento. Se aplicaron medidas cautelares de suspensión provisoria inmediata al amparo de la Ley Aula Segura.",
    checklistDebidoProceso: buildChecklistForCausa([
      { id: 'chk_rec_1', registradoPor: 'Rectoría', observaciones: 'Denuncia de hechos del Inspector Arturo Fuentes ingresada de oficio.', documentoNombre: 'Informe_Siniestro_Inspector Fuertes.pdf', fechaCompletado: relativeDate(14) },
      { id: 'chk_rec_2', registradoPor: 'Rectoría', observaciones: 'Caso tipificado como Falta Gravísima artículo RICE AS1 (Agresión física grave).', fechaCompletado: relativeDate(14) },
      { id: 'chk_rec_3', registradoPor: 'Esteban Valenzuela', observaciones: 'Notificación presencial cursada al apoderado en dependencias de Rectoría.', documentoNombre: 'Oficio_Notificación_Firmada.pdf', fechaCompletado: relativeDate(13) },
      { id: 'chk_inv_1', registradoPor: 'Rectoría', observaciones: 'Activada medida cautelar de suspensión provisoria por 10 días bajo marco legal Aula Segura.', documentoNombre: 'Decreto_Suspensión_Aula_Segura.pdf', fechaCompletado: relativeDate(13) },
      { id: 'chk_inv_2', registradoPor: 'Esteban Valenzuela', observaciones: 'Enviada carta de citación a entrevista de descargos en conjunto con ministro de fe.', fechaCompletado: relativeDate(12) },
      { id: 'chk_inv_3', registradoPor: 'Esteban Valenzuela', observaciones: 'Declaración tomada a inspectores y docentes testigos presenciales firmadas en folio.', documentoNombre: 'Acta_Declaraciones_Testigos.pdf', fechaCompletado: relativeDate(10) },
      { id: 'chk_res_1', registradoPor: 'Esteban Valenzuela', observaciones: 'Informe de cierre emitido a Dirección sugiriendo aplicación de sanción con plan formativo.', documentoNombre: 'Informe_Cierre_Concluyente_IVC.pdf', fechaCompletado: relativeDate(4) }
    ]),
    conductaRiceId: "AS1",
    medidasEjecutadas: [
      "formativa:Plan de acompañamiento psicosocial inmediato (agresor y víctima)",
      "disciplinaria:Suspensión preventiva inmediata durante investigación interna (máx. 10 días, prórroga 5 días)"
    ],
    bitacora: [
      {
        id: "b_11_1",
        fecha: relativeDateTime(14, "10:30"),
        tipo: 'Otro',
        titulo: "Agresión física grave reportada a Rectoría",
        descripcion: "Estudiante empuja fuertemente a Inspector General en el patio central durante recreo tras recibir llamado de atención normativo. Presenciado por múltiples alumnos.",
        participantes: ["Benjamín Muñoz", "Inspector General Arturo Fuentes", "Rectoría"]
      },
      {
        id: "b_11_2",
        fecha: relativeDateTime(14, "12:00"),
        tipo: 'Evidencia',
        titulo: "Notificación de Medida Cautelar de Suspensión Provisoria (Aula Segura)",
        descripcion: "Rectoría firma decreto de suspensión preventiva para asegurar integridad del afectado y funcionamiento escolar. Se despacha personal al establecimiento de domicilio del apoderado.",
        participantes: ["Apoderado de Benjamín", "Rectoría", "Inspector Arturo Fuentes"]
      },
      {
        id: "b_11_3",
        fecha: relativeDateTime(13, "15:00"),
        tipo: 'Notificación',
        titulo: "Envío de reporte a Superintendencia de Educación (Supereduc) y Carabineros",
        descripcion: "Al amparo de la Circular 482 y la Ley 21809 de Convivencia Escolar, se despacha el oficio ministerial obligatorio de notificación de hechos extremos en 24h hábiles.",
        participantes: ["Rectoría", "Ministerio de Educación (Supereduc)"]
      },
      {
        id: "b_11_4",
        fecha: relativeDateTime(4, "09:00"),
        tipo: 'Evidencia',
        titulo: "Emisión de Informe de Cierre de Indagación con agravantes",
        descripcion: "Sistematización de testimonios recopilados. Se confirma agresión física deliberada. Se eleva el informe a Rectoría recomendando citar a entrevista decisiva de descargos.",
        participantes: ["Esteban Valenzuela"]
      }
    ]
  },
  {
    id: "DC-2026-008",
    estudianteNombre: "Tomás Ignacio Carrasco Ugarte",
    estudianteCurso: "8° Básico A",
    nnaProtectedName: "T. I. C. U.",
    runEstudiante: "24.981.442-1",
    fechaApertura: relativeDate(32), // 2026-04-25
    estadoActual: EstadoCausa.MEDIACION_EN_DESARROLLO,
    tipoInfraccion: 'Leve',
    responsable: "Lorena Gajardo (Mediadora Escolar)",
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: relativeDate(3), // 2026-05-24
    observaciones: "Conflictos relacionales reiterados y burlas cruzadas con compañero de banco en horas de Educación Física. Derivado a proceso alternativo de mediación escolar de conformidad con el Título III del RIE.",
    checklistDebidoProceso: buildChecklistForCausa([
      { id: 'chk_rec_1', registradoPor: 'Esteban Valenzuela', observaciones: 'Ingreso inicial por reporte de docente de educación física.', fechaCompletado: relativeDate(32) },
      { id: 'chk_rec_2', registradoPor: 'Esteban Valenzuela', observaciones: 'Admisible como conflicto relacional leve. Se analiza factibilidad de resolución pacífica.', fechaCompletado: relativeDate(32) },
      { id: 'chk_rec_3', registradoPor: 'Esteban Valenzuela', observaciones: 'Notificados apoderados telefónicamente y mediante circular informativa presencial.', fechaCompletado: relativeDate(31) },
      { id: 'chk_inv_1', registradoPor: 'Esteban Valenzuela', observaciones: 'Separación preventiva de puestos en sala de clases.', fechaCompletado: relativeDate(31) },
      { id: 'chk_inv_2', registradoPor: 'Lorena Gajardo', observaciones: 'Citados apoderados a proponer mediación alternativa voluntaria.', fechaCompletado: relativeDate(26) },
      { id: 'chk_inv_3', registradoPor: 'Lorena Gajardo', observaciones: 'Derivación oficial admitida bajo consentimiento unánime de los apoderados.', documentoNombre: 'Convenio_Derivación_Mediación.pdf', fechaCompletado: relativeDate(26) },
      { id: 'chk_inv_4', registradoPor: 'Lorena Gajardo', observaciones: 'Mediación en desarrollo, habiéndose efectuado la primera sesión de acercamiento relacional.', fechaCompletado: relativeDate(24) }
    ]),
    conductaRiceId: "L8",
    medidasEjecutadas: [],
    bitacora: [
      {
        id: "b_8_1",
        fecha: relativeDateTime(32, "14:15"),
        tipo: 'Otro',
        titulo: "Recepción de reporte emitido por Docente de Ed. Física",
        descripcion: "Sujeto a reiteradas agresiones verbales indirectas y mofas sistemáticas durante dinámicas de equipo escolar.",
        participantes: ["Docente Ed. Física", "Esteban Valenzuela"]
      },
      {
        id: "b_8_2",
        fecha: relativeDateTime(25, "11:00"),
        tipo: 'Mediación',
        titulo: "Resolución de derivación a Mediación de Pares",
        descripcion: "Evaluados los descargos de ambos estudiantes y el consentimiento expreso de sus apoderados, se suspende temporalmente indagatoria disciplinaria ordinaria para ingresar a canal restaurativo voluntario tutorado.",
        participantes: ["Lorena Gajardo", "Ambos Apoderados"]
      },
      {
        id: "b_8_3",
        fecha: relativeDateTime(10, "15:30"),
        tipo: 'Mediación',
        titulo: "Primera sesión de avenimiento y acuerdos iniciales",
        descripcion: "Ambos alumnos dialogan abiertamente asistidos por la mediadora. Definen pautas de sana convivencia de banco y disculpa privada por malos entendidos en el camarín deportivo.",
        participantes: ["Tomás Carrasco", "Estudiante B", "Lorena Gajardo"]
      }
    ]
  },
  {
    id: "DC-2026-003",
    estudianteNombre: "Martín Alonso Godoy Cárdenas",
    estudianteCurso: "II° Medio A",
    nnaProtectedName: "M. A. G. C.",
    runEstudiante: "23.952.183-1",
    fechaApertura: relativeDate(45), // 2026-04-12
    estadoActual: EstadoCausa.PROCESO_SEGUIMIENTO,
    tipoInfraccion: 'Grave',
    responsable: "Patricia Soto (Psicóloga Escolar)",
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: relativeDate(10), // 2026-05-17
    observaciones: "Portar encendedor de antorcha y generar foco de combustión controlado en contenedores externos del gimnasio escolar. Proceso sancionado y bajo plan formativo del Plan de Convivencia Escolar.",
    checklistDebidoProceso: buildChecklistForCausa([
      { id: 'chk_rec_1', registradoPor: 'Inspector Fuentes', observaciones: 'Registro de flagrancia suscrito por inspector y directivo.', documentoNombre: 'Parte_Siniestro_Gimnasio.pdf', fechaCompletado: relativeDate(45) },
      { id: 'chk_rec_2', registradoPor: 'Esteban Valenzuela', observaciones: 'Caso grave según RIE art. 26 por porte inapropiado de combustible.', fechaCompletado: relativeDate(45) },
      { id: 'chk_rec_3', registradoPor: 'Esteban Valenzuela', observaciones: 'Notificación enviada por mano al apoderado citado.', documentoNombre: 'Notificación_MartínGodoy.pdf', fechaCompletado: relativeDate(44) },
      { id: 'chk_inv_1', registradoPor: 'Esteban Valenzuela', observaciones: 'Derivación preventiva a acompañamiento de psicólogo escolar.', documentoNombre: 'Acta_Medidas_Resguardo.pdf', fechaCompletado: relativeDate(44) },
      { id: 'chk_inv_2', registradoPor: 'Esteban Valenzuela', observaciones: 'Enviadas citaciones a entrevistas bajo firmas.', fechaCompletado: relativeDate(42) },
      { id: 'chk_inv_3', registradoPor: 'Esteban Valenzuela', observaciones: 'Toma de declaración y actas del menor y testigos incorporadas.', documentoNombre: 'Actas_Declaraciones_Estudiante.pdf', fechaCompletado: relativeDate(40) },
      { id: 'chk_res_1', registradoPor: 'Esteban Valenzuela', observaciones: 'Informe concluyente despachado sugiriendo condicionalidad y apoyo psicoterapéutico.', documentoNombre: 'Informe_Concluyente_IIMedioA.pdf', fechaCompletado: relativeDate(35) },
      { id: 'chk_res_2', registradoPor: 'Esteban Valenzuela', observaciones: 'Audiencia efectuada con asistencia del apoderado de Martín.', documentoNombre: 'Acta_Derecho_Oido_Firmado.pdf', fechaCompletado: relativeDate(32) },
      { id: 'chk_res_3', registradoPor: 'Rectoría', observaciones: 'Rectoría emite Resolución exenta N°04 decretando condicionalidad.', documentoNombre: 'Resolucion_Rectoral_N04.pdf', fechaCompletado: relativeDate(30) },
      { id: 'chk_res_4', registradoPor: 'Esteban Valenzuela', observaciones: 'Notificado el apoderado registrando firma de recepción conforme.', documentoNombre: 'Formulario_Notificacion_Resolucion.pdf', fechaCompletado: relativeDate(30) },
      { id: 'chk_imp_1', registradoPor: 'Esteban Valenzuela', observaciones: 'Transcurrido el plazo sin que el apoderado hiciera uso de recurso impugnatorio.', fechaCompletado: relativeDate(25) },
      { id: 'chk_seg_1', registradoPor: 'Patricia Soto', observaciones: 'Ingresado al taller de contención de riesgos y control psicológico escolar.', documentoNombre: 'Plan_Acompanamiento_P PCE.pdf', fechaCompletado: relativeDate(24) }
    ]),
    conductaRiceId: "G2",
    medidasEjecutadas: [
      "formativa:Entrevista reflexiva con equipo de conv. (45-60 min) con acta firmada",
      "formativa:Carta de compromiso conductual (máx. 30 días)"
    ],
    bitacora: [
      {
        id: "b_3_1",
        fecha: relativeDateTime(45, "16:00"),
        tipo: 'Otro',
        titulo: "Registro del siniestro amagado",
        descripcion: "Inspector detecta humo menor tras bodegas del gimnasio. El estudiante hizo entrega voluntaria de los elementos combustibles. Sin heridos ni daños materiales estructurales.",
        participantes: ["Martín Godoy", "Inspector Fuentes"]
      },
      {
        id: "b_3_2",
        fecha: relativeDateTime(30, "14:15"),
        tipo: 'Resolución',
        titulo: "Notificación de la Resolución Rectoral N°04",
        descripcion: "Se decreta condicionalidad de matrícula amparada en Reglamento Interno. Se anexa obligatoriedad de participar activamente en taller preventivo de manejo de conductas de riesgo y apoyo psicológico.",
        participantes: ["Martín Godoy", "Apoderado de Martín", "Esteban Valenzuela"]
      },
      {
        id: "b_3_3",
        fecha: relativeDateTime(15, "09:00"),
        tipo: 'Resolución',
        titulo: "Ingreso de plan de acompañamiento psicoterapéutico",
        descripcion: "Psicóloga realiza derivación complementaria a terapeuta externo y planifica control escolar semanal de pautas formativas. El alumno demuestra alta disposición cooperadora.",
        participantes: ["Patricia Soto", "Martín Godoy"]
      }
    ]
  }
];

export const getStats = (causas: Causa[]): Statistics => {
  const stats: Statistics = {
    total: causas.length,
    porFase: {
      'Recepción': 0,
      'Investigación': 0,
      'Resolución': 0,
      'Impugnación': 0,
      'Seguimiento': 0
    },
    porGravedad: {
      'Leve': 0,
      'Grave': 0,
      'Muy Grave': 0,
      'Gravísima': 0
    },
    conPlazoCritico: 0,
    aulaSeguraActivas: 0
  };

  causas.forEach(c => {
    // Fase
    const fase = getFaseForEstado(c.estadoActual);
    stats.porFase[fase] += 1;

    // Gravedad
    stats.porGravedad[c.tipoInfraccion] += 1;

    // Aula Segura
    if (c.comprometeAulaSegura) {
      stats.aulaSeguraActivas += 1;
    }

    // Plazos fatales check (highly visual!)
    // For Aula Segura, 10 working days max to investigate and resolve.
    // Let's mock cases with critical deadlines.
    if (c.estadoActual !== EstadoCausa.CAUSA_CERRADA && c.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA) {
      if (c.comprometeAulaSegura) {
        stats.conPlazoCritico += 1; // Aula segura has tighter statutory scrutiny
      }
    }
  });

  return stats;
};
