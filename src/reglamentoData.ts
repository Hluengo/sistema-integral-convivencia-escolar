/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Reglamento Interno de Convivencia Escolar (RICE 2026)
 * Colegio Carmela Romero de Espinosa - Madres Dominicas - Concepción
 */

export interface ConductaReglamentada {
  id: string; // e.g., "L1"
  numero: number;
  conducta: string;
  gravedad: 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima';
  articulo: string; // e.g., "Art. 24", "Art. 25"
  medidasFormativas: string[];
  medidasDisciplinarias: string[];
  responsable: string;
}

export const REGLAMENTO_CONDUCTAS: ConductaReglamentada[] = [
  // --- LEVES ---
  {
    id: "L1",
    numero: 1,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Llegar atrasado(a) al inicio de la jornada escolar o después de los recreos, sin justificación.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L2",
    numero: 2,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Asistir al establecimiento sin uniforme o con uniforme incompleto, sin autorización previa.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L3",
    numero: 3,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Presentar deficiencia en la higiene o presentación personal.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L4",
    numero: 4,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Asistir sin la agenda escolar correspondiente.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L5",
    numero: 5,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "No entregar circulares, comunicados o evaluaciones firmadas por el apoderado/a dentro del plazo establecido.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L6",
    numero: 6,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Depositar basura o desperdicios fuera de los lugares habilitados.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L7",
    numero: 7,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "No justificar inasistencias ante el establecimiento dentro del tiempo indicado.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L8",
    numero: 8,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Interrumpir el desarrollo normal de clases, actos o actividades institucionales mediante conversaciones, risas o movimientos innecesarios.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L9",
    numero: 9,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "No entregar trabajos, tareas o evaluaciones en la fecha indicada.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L10",
    numero: 10,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Asistir a clases sin materiales o sin las tareas requeridas.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L11",
    numero: 11,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Comer dentro del aula sin autorización.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L12",
    numero: 12,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Usar objetos que no sean necesarios para la actividad pedagógica y que interfieran en el desarrollo de la clase.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L13",
    numero: 13,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Utilizar pertenencias de otros sin consentimiento.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L14",
    numero: 14,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "Demostrar afecto físico inapropiado para el contexto educativo (besos, caricias, sentarse sobre otro estudiante, ocultarse para besarse, etc.).",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },
  {
    id: "L15",
    numero: 15,
    gravedad: 'Leve',
    articulo: "Art. 24",
    conducta: "No devolver materiales o libros a la biblioteca en el plazo acordado.",
    medidasFormativas: ["Diálogo formativo individual", "Reflexión escrita o verbal", "Compromiso personal de mejora (máx. 30 días)"],
    medidasDisciplinarias: ["Llamado de atención verbal", "Anotación en libro de clases (si persiste)"],
    responsable: "Docente / Inspectoría"
  },

  // --- GRAVES ---
  {
    id: "G1",
    numero: 1,
    gravedad: 'Grave',
    articulo: "Art. 25",
    conducta: "Faltar a la verdad u ocultar información relevante en el contexto escolar.",
    medidasFormativas: ["Entrevista reflexiva con equipo de conv. (45-60 min) con acta firmada", "Carta de compromiso conductual (máx. 30 días)", "Reparación simbólica o material (restitución/acción comunitaria)", "Talleres de habilidades socioemocionales"],
    medidasDisciplinarias: ["Carta de Amonestación Formal", "Suspensión temporal de 3 a 5 días hábiles, según gravedad y reincidencia", "Citación al apoderado para seguimiento conductual"],
    responsable: "Coordinación de Ciclo / Dirección de Ciclo"
  },
  {
    id: "G2",
    numero: 2,
    gravedad: 'Grave',
    articulo: "Art. 25",
    conducta: "Participar o promover disturbios en el establecimiento, de forma presencial o virtual.",
    medidasFormativas: ["Entrevista reflexiva con equipo de conv. (45-60 min) con acta firmada", "Carta de compromiso conductual (máx. 30 días)", "Reparación simbólica o material (restitución/acción comunitaria)", "Talleres de habilidades socioemocionales"],
    medidasDisciplinarias: ["Carta de Amonestación Formal", "Suspensión temporal de 3 a 5 días hábiles, según gravedad y reincidencia", "Citación al apoderado para seguimiento conductual"],
    responsable: "Coordinación de Ciclo / Dirección de Ciclo"
  },
  {
    id: "G3",
    numero: 3,
    gravedad: 'Grave',
    articulo: "Art. 25",
    conducta: "Utilizar lenguaje ofensivo o vulgar dentro o fuera del colegio, cuando se representa a la institución.",
    medidasFormativas: ["Entrevista reflexiva con equipo de conv. (45-60 min) con acta firmada", "Carta de compromiso conductual (máx. 30 días)", "Reparación simbólica o material (restitución/acción comunitaria)", "Talleres de habilidades socioemocionales"],
    medidasDisciplinarias: ["Carta de Amonestación Formal", "Suspensión temporal de 3 a 5 días hábiles, según gravedad y reincidencia", "Citación al apoderado para seguimiento conductual"],
    responsable: "Coordinación de Ciclo / Dirección de Ciclo"
  },
  {
    id: "G4",
    numero: 4,
    gravedad: 'Grave',
    articulo: "Art. 25",
    conducta: "Faltar el respeto a integrantes de la comunidad educativa mediante palabras, gestos o actitudes despectivas.",
    medidasFormativas: ["Entrevista reflexiva con equipo de conv. (45-60 min) con acta firmada", "Carta de compromiso conductual (máx. 30 días)", "Reparación simbólica o material (restitución/acción comunitaria)", "Talleres de habilidades socioemocionales"],
    medidasDisciplinarias: ["Carta de Amonestación Formal", "Suspensión temporal de 3 a 5 días hábiles, según gravedad y reincidencia", "Citación al apoderado para seguimiento conductual"],
    responsable: "Coordinación de Ciclo / Dirección de Ciclo"
  },
  {
    id: "G5",
    numero: 5,
    gravedad: 'Grave',
    articulo: "Art. 25",
    conducta: "Agredir física o verbalmente a otra persona (empujones, insultos, gestos ofensivos, etc.).",
    medidasFormativas: ["Entrevista reflexiva con equipo de conv. (45-60 min) con acta firmada", "Carta de compromiso conductual (máx. 30 días)", "Reparación simbólica o material (restitución/acción comunitaria)", "Talleres de habilidades socioemocionales"],
    medidasDisciplinarias: ["Carta de Amonestación Formal", "Suspensión temporal de 3 a 5 días hábiles, según gravedad y reincidencia", "Citación al apoderado para seguimiento conductual"],
    responsable: "Coordinación de Ciclo / Dirección de Ciclo"
  },
  {
    id: "G6",
    numero: 6,
    gravedad: 'Grave',
    articulo: "Art. 25",
    conducta: "Copiar, facilitar o difundir información durante evaluaciones; plagiar trabajos o sustraer información académica (fraude académico o plagio).",
    medidasFormativas: ["Entrevista reflexiva con equipo de conv. (45-60 min) con acta firmada", "Carta de compromiso conductual (máx. 30 días)", "Reparación simbólica o material (restitución/acción comunitaria)", "Talleres de habilidades socioemocionales"],
    medidasDisciplinarias: ["Carta de Amonestación Formal", "Suspensión temporal de 3 a 5 días hábiles, según gravedad y reincidencia", "Citación al apoderado para seguimiento conductual"],
    responsable: "Coordinación de Ciclo / Dirección de Ciclo"
  },
  {
    id: "G7",
    numero: 7,
    gravedad: 'Grave',
    articulo: "Art. 25",
    conducta: "Ausentarse de clases sin autorización mientras se encuentra en el establecimiento.",
    medidasFormativas: ["Entrevista reflexiva con equipo de conv. (45-60 min) con acta firmada", "Carta de compromiso conductual (máx. 30 días)", "Reparación simbólica o material (restitución/acción comunitaria)", "Talleres de habilidades socioemocionales"],
    medidasDisciplinarias: ["Carta de Amonestación Formal", "Suspensión temporal de 3 a 5 días hábiles, según gravedad y reincidencia", "Citación al apoderado para seguimiento conductual"],
    responsable: "Coordinación de Ciclo / Dirección de Ciclo"
  },
  {
    id: "G8",
    numero: 8,
    gravedad: 'Grave',
    articulo: "Art. 25",
    conducta: "Realizar colectas, ventas o solicitudes de dinero sin autorización institucional.",
    medidasFormativas: ["Entrevista reflexiva con equipo de conv. (45-60 min) con acta firmada", "Carta de compromiso conductual (máx. 30 días)", "Reparación simbólica o material (restitución/acción comunitaria)", "Talleres de habilidades socioemocionales"],
    medidasDisciplinarias: ["Carta de Amonestación Formal", "Suspensión temporal de 3 a 5 días hábiles, según gravedad y reincidencia", "Citación al apoderado para seguimiento conductual"],
    responsable: "Coordinación de Ciclo / Dirección de Ciclo"
  },
  {
    id: "G9",
    numero: 9,
    gravedad: 'Grave',
    articulo: "Art. 25",
    conducta: "Usar el teléfono celular dentro del aula sin autorización del docente.",
    medidasFormativas: ["Entrevista reflexiva con equipo de conv. (45-60 min) con acta firmada", "Carta de compromiso conductual (máx. 30 días)", "Reparación simbólica o material (restitución/acción comunitaria)", "Talleres de habilidades socioemocionales"],
    medidasDisciplinarias: ["Carta de Amonestación Formal", "Suspensión temporal de 3 a 5 días hábiles, según gravedad y reincidencia", "Citación al apoderado para seguimiento conductual"],
    responsable: "Coordinación de Ciclo / Dirección de Ciclo"
  },

  // --- MUY GRAVES ---
  {
    id: "MG1",
    numero: 1,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Falsificar o adulterar firmas en documentos institucionales.",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP): objetivos, acompañamiento psicosocial y plazos", "Acompañamiento Psicosocial Intensivo (6 a 8 sesiones con psicólogo/a)", "Mediación Restaurativa Supervisada (encuentro de diálogo voluntario)"],
    medidasDisciplinarias: ["Reposición o reparación del daño material según Contrato de Prestación de Servicio", "Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula por reiteridad o gravedad", "No renovación de matrícula para el año siguiente en reincidencias"],
    responsable: "Equipo de Convivencia Escolar"
  },
  {
    id: "MG2",
    numero: 2,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Dañar, ocultar o destruir bienes del colegio o de cualquier integrante de la comunidad de forma voluntaria.",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP): objetivos, acompañamiento psicosocial y plazos", "Acompañamiento Psicosocial Intensivo (6 a 8 sesiones)", "Mediación Restaurativa Supervisada"],
    medidasDisciplinarias: ["Reposición o reparación del daño", "Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula", "No renovación de matrícula en reincidencia"],
    responsable: "Equipo de Convivencia Escolar"
  },
  {
    id: "MG3",
    numero: 3,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Participar en riñas dentro o fuera de la escuela, cuando se representa oficialmente al colegio.",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP)", "Acompañamiento Psicosocial Intensivo", "Mediación Restaurativa Supervisada"],
    medidasDisciplinarias: ["Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula", "No renovación de matrícula en reincidencia"],
    responsable: "Equipo de Convivencia Escolar"
  },
  {
    id: "MG4",
    numero: 4,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Abandonar clases o salir del establecimiento sin la debida autorización de inspectores o docentes.",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP)", "Acompañamiento Psicosocial Intensivo"],
    medidasDisciplinarias: ["Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula"],
    responsable: "Equipo de Convivencia Escolar"
  },
  {
    id: "MG5",
    numero: 5,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Promover, poseer o difundir material pornográfico o de connotación sexual en dependencias escolares o redes vinculadas.",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP)", "Acompañamiento Psicosocial Intensivo", "Derivación a programa externo acreditado (OLN u otro)"],
    medidasDisciplinarias: ["Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula", "No renovación de matrícula en reincidencia"],
    responsable: "Equipo de Convivencia Escolar"
  },
  {
    id: "MG6",
    numero: 6,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Falsificar documentos oficiales del colegio (libros de clase, certificados de estudio, informes, etc.).",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP)", "Acompañamiento Psicosocial Intensivo"],
    medidasDisciplinarias: ["Reposición o reparación del daño material", "Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula", "No renovación de matrícula"],
    responsable: "Equipo de Convivencia Escolar"
  },
  {
    id: "MG7",
    numero: 7,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Impedir el acceso o funcionamiento normal del establecimiento mediante tomas u otras acciones colectivas deliberadas.",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP)", "Acompañamiento Psicosocial Intensivo"],
    medidasDisciplinarias: ["Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula", "No renovación de matrícula"],
    responsable: "Equipo de Convivencia Escolar"
  },
  {
    id: "MG8",
    numero: 8,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Grabar o divulgar imágenes, videos o audios que afecten la dignidad, privacidad o reputación de una persona de la comunidad escolar.",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP)", "Acompañamiento Psicosocial de intervención", "Derivación externa (OLN, etc.)"],
    medidasDisciplinarias: ["Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula", "No renovación de matrícula"],
    responsable: "Equipo de Convivencia Escolar"
  },
  {
    id: "MG9",
    numero: 9,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Discriminar arbitrariamente a miembros de la comunidad educativa por condición social, origen, etnia, género, orientación sexual, religión, discapacidad.",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP) enfocado en inclusión", "Acompañamiento Psicosocial Intensivo"],
    medidasDisciplinarias: ["Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula", "No renovación de matrícula"],
    responsable: "Equipo de Convivencia Escolar"
  },
  {
    id: "MG10",
    numero: 10,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Ejercer violencia física o psicológica contra cualquier integrante de la comunidad educativa.",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP)", "Acompañamiento Psicosocial Intensivo", "Derivación obligatoria a organismos externos (OLN, etc.)"],
    medidasDisciplinarias: ["Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula", "No renovación de la matrícula"],
    responsable: "Equipo de Convivencia Escolar"
  },
  {
    id: "MG11",
    numero: 11,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Amenazar, hostigar o difamar a otros a través de mensajes, redes sociales o plataformas digitales, incluyendo uso de IA (deepfakes, doxxing).",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP)", "Acompañamiento Psicosocial", "Mediación Restaurativa Supervisada"],
    medidasDisciplinarias: ["Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula", "No renovación de la matrícula"],
    responsable: "Equipo de Convivencia"
  },
  {
    id: "MG12",
    numero: 12,
    gravedad: 'Muy Grave',
    articulo: "Art. 26",
    conducta: "Participar en actos reiterados de acoso escolar o bullying.",
    medidasFormativas: ["Plan de Intervención Personalizado (PIP)", "Acompañamiento Psicosocial Intensivo con psicólogo/a", "Esquemas de reparación intergrupales"],
    medidasDisciplinarias: ["Suspensión temporal de 4 a 5 días hábiles", "Condicionalidad de matrícula reincidente", "No renovación de matrícula para año siguiente"],
    responsable: "Equipo de Convivencia Escolar"
  },

  // --- GRAVÍSIMAS (AULA SEGURA LEY 21.128) ---
  {
    id: "AS1",
    numero: 1,
    gravedad: 'Gravísima',
    articulo: "Art. 27",
    conducta: "Ejercer violencia física en contra de cualquier integrante de la comunidad educacional.",
    medidasFormativas: ["Derecho a defensa y apelación garantizado", "Plan de acompañamiento psicosocial inmediato (agresor y víctima)", "Derivación obligatoria a redes externas (OLN, Tribunales de Familia o Fiscalía)", "Taller obligatorio de control emocional"],
    medidasDisciplinarias: ["Suspensión preventiva inmediata durante investigación interna (máx. 10 días, prórroga 5 días)", "Cancelación de matrícula o expulsión inmediata, garantizando reubicación por Mineduc"],
    responsable: "Rectoría del Colegio"
  },
  {
    id: "AS2",
    numero: 2,
    gravedad: 'Gravísima',
    articulo: "Art. 27",
    conducta: "Lanzar objetos o líquidos desde el edificio del establecimiento, al interior o exterior del Colegio (respondiendo por daños colaterales).",
    medidasFormativas: ["Derecho a defensa y apelación", "Plan de acompañamiento inmediato", "Derivación a redes externas"],
    medidasDisciplinarias: ["Suspensión preventiva inmediata durante investigación", "Cancelación de matrícula o expulsión definitiva según gravedad de lesionados"],
    responsable: "Rectoría del Colegio"
  },
  {
    id: "AS3",
    numero: 3,
    gravedad: 'Gravísima',
    articulo: "Art. 27",
    conducta: "Portar, usar o suministrar de armas o artefactos explosivos (reales o simulados), gas pimienta, encender fuego deliberado (humo/ruido).",
    medidasFormativas: ["Derecho a defensa", "Acompañamiento psicosocial", "Derivación obligatoria a Fiscalía/Tribunales"],
    medidasDisciplinarias: ["Suspensión preventiva inmediata", "Cancelación de matrícula o expulsión del establecimiento (obligatorio denunciar en menos de 24 horas)"],
    responsable: "Rectoría del Colegio"
  },
  {
    id: "AS4",
    numero: 4,
    gravedad: 'Gravísima',
    articulo: "Art. 27",
    conducta: "Distribución, comercialización, porte o consumo de tabaco, cigarrillos electrónicos (vapeadores), alcohol, drogas o fármacos psicotrópicos.",
    medidasFormativas: ["Derecho a defensa", "Plan de acompañamiento psicosocial inmediato", "Derivación a redes de salud mental y SENDA"],
    medidasDisciplinarias: ["Suspensión preventiva inmediata", "Cancelación o expulsión de matrícula"],
    responsable: "Rectoría del Colegio"
  },
  {
    id: "AS5",
    numero: 5,
    gravedad: 'Gravísima',
    articulo: "Art. 27",
    conducta: "Realizar actos constitutivos de abuso o acoso de connotación sexual en contra de otro miembro de la comunidad.",
    medidasFormativas: ["Resguardo extremo a la intimidad y la víctima", "Derivación inmediata y obligatoria a redes externas (Fiscalía, OLN, Carabineros)", "Acompañamiento psicosocial inmediato"],
    medidasDisciplinarias: ["Suspensión preventiva inmediata durante investigación", "Expulsión definitiva o cancelación de la matrícula"],
    responsable: "Rectoría del Colegio"
  }
];
