import { Student, Annotation } from '../types';

export const MOCK_STUDENTS: Student[] = [
  {
    id: 'st-01',
    full_name: 'Constanza Belén Valenzuela Pinto',
    course_id: '4° Medio A',
    teacher_id: 'Mariela Sepúlveda',
    status: 'Activo',
    tenant_id: 'colegio-carmela-concepcion',
    annotations_count: 16,
    positive_annotations_count: 4,
    last_annotation_date: '2026-07-12',
    disciplinary_status: 'Rojo',
    rut: '21.432.891-K'
  },
  {
    id: 'st-02',
    full_name: 'Benjamín Andrés Carvajal Retamal',
    course_id: '2° Medio B',
    teacher_id: 'Roberto Lagos',
    status: 'Activo',
    tenant_id: 'colegio-carmela-concepcion',
    annotations_count: 11,
    positive_annotations_count: 3,
    last_annotation_date: '2026-07-10',
    disciplinary_status: 'Naranja',
    rut: '22.109.543-2'
  },
  {
    id: 'st-03',
    full_name: 'Sofía Valentina Henríquez Sanhueza',
    course_id: '8° Básico A',
    teacher_id: 'Carolina Alarcón',
    status: 'Activo',
    tenant_id: 'colegio-carmela-concepcion',
    annotations_count: 6,
    positive_annotations_count: 7,
    last_annotation_date: '2026-07-13',
    disciplinary_status: 'Amarillo',
    rut: '23.456.128-4'
  },
  {
    id: 'st-04',
    full_name: 'Diego Alejandro San Martín Muñoz',
    course_id: '3° Medio B',
    teacher_id: 'Patricia Arriagada',
    status: 'Activo',
    tenant_id: 'colegio-carmela-concepcion',
    annotations_count: 15,
    positive_annotations_count: 1,
    last_annotation_date: '2026-07-11',
    disciplinary_status: 'Rojo',
    rut: '21.890.334-9'
  },
  {
    id: 'st-05',
    full_name: 'Matías Ignacio Toledo Gacitúa',
    course_id: '1° Medio A',
    teacher_id: 'Eduardo Neira',
    status: 'Activo',
    tenant_id: 'colegio-carmela-concepcion',
    annotations_count: 3,
    positive_annotations_count: 9,
    last_annotation_date: '2026-07-08',
    disciplinary_status: 'Verde',
    rut: '22.887.654-K'
  }
];

export const MOCK_ANNOTATIONS: Annotation[] = [
  // Constanza
  { id: 'an-001', student_id: 'st-01', text: 'Llega 15 minutos tarde al inicio de la jornada escolar sin justificación.', date: '2026-06-02', severity: 'Leve', registered_by: 'Inspector Jorge Díaz', type: 'Negativa' },
  { id: 'an-002', student_id: 'st-01', text: 'Presenta uniforme incompleto y asiste con accesorios no discretos.', date: '2026-06-05', severity: 'Leve', registered_by: 'Inspectora Sonia Vera', type: 'Negativa' },
  { id: 'an-003', student_id: 'st-01', text: 'No entrega la circular firmada por el apoderado dentro del plazo legal.', date: '2026-06-09', severity: 'Leve', registered_by: 'Prof. Mariela Sepúlveda', type: 'Negativa' },
  { id: 'an-004', student_id: 'st-01', text: 'Interrumpe reiteradamente la clase de lenguaje con conversaciones ajenas al tema.', date: '2026-06-12', severity: 'Leve', registered_by: 'Prof. Mariela Sepúlveda', type: 'Negativa' },
  { id: 'an-005', student_id: 'st-01', text: 'Se le encuentra comiendo dentro del aula sin autorización durante la clase.', date: '2026-06-16', severity: 'Leve', registered_by: 'Prof. Mario Gatica', type: 'Negativa' },
  { id: 'an-006', student_id: 'st-01', text: 'Utiliza el teléfono celular dentro de la sala de clases durante una evaluación de Matemáticas.', date: '2026-06-20', severity: 'Grave', registered_by: 'Prof. Roberto Lagos', type: 'Negativa' },
  { id: 'an-007', student_id: 'st-01', text: 'Falta el respeto al profesor jefe mediante contestaciones despectivas y gestos desafiantes al ser corregida.', date: '2026-06-23', severity: 'Grave', registered_by: 'Prof. Mariela Sepúlveda', type: 'Negativa' },
  { id: 'an-008', student_id: 'st-01', text: 'Falta a la verdad respecto a su inasistencia justificando que estaba en enfermería.', date: '2026-06-26', severity: 'Grave', registered_by: 'Inspector Jorge Díaz', type: 'Negativa' },
  { id: 'an-009', student_id: 'st-01', text: 'Ausente de la clase de Historia sin autorización previa estando presente en el colegio.', date: '2026-06-30', severity: 'Grave', registered_by: 'Prof. Sonia Castro', type: 'Negativa' },
  { id: 'an-010', student_id: 'st-01', text: 'Utiliza lenguaje grosero e insulta a un compañero en el pasillo durante el recreo.', date: '2026-07-01', severity: 'Grave', registered_by: 'Inspectora Sonia Vera', type: 'Negativa' },
  { id: 'an-011', student_id: 'st-01', text: 'Participa en disturbios y gritos en el casino del establecimiento.', date: '2026-07-03', severity: 'Grave', registered_by: 'Inspector Jorge Díaz', type: 'Negativa' },
  { id: 'an-012', student_id: 'st-01', text: 'Saca y oculta las pertenencias de una compañera de curso sin su consentimiento.', date: '2026-07-06', severity: 'Grave', registered_by: 'Prof. Mariela Sepúlveda', type: 'Negativa' },
  { id: 'an-013', student_id: 'st-01', text: 'Se evade o abandona la sala de clases saltando por una ventana del primer piso.', date: '2026-07-08', severity: 'Muy Grave', registered_by: 'Prof. Mario Gatica', type: 'Negativa' },
  { id: 'an-014', student_id: 'st-01', text: 'Daña deliberadamente un proyector de la sala de clases al arrojarle un borrador.', date: '2026-07-10', severity: 'Muy Grave', registered_by: 'Prof. Roberto Lagos', type: 'Negativa' },
  { id: 'an-015', student_id: 'st-01', text: 'Graba un video a escondidas de una compañera en los baños y lo difunde por redes sociales afectando su reputación.', date: '2026-07-11', severity: 'Muy Grave', registered_by: 'Equipo de Convivencia', type: 'Negativa' },
  { id: 'an-016', student_id: 'st-01', text: 'Es descubierta manipulando los extintores de incendio del tercer piso sin autorización.', date: '2026-07-12', severity: 'Muy Grave', registered_by: 'Inspector Jorge Díaz', type: 'Negativa' },
  { id: 'an-pos-001', student_id: 'st-01', text: 'Colabora activamente en la ornamentación de la sala de clases para el aniversario.', date: '2026-06-15', severity: 'Leve', registered_by: 'Prof. Mariela Sepúlveda', type: 'Positiva' },
  { id: 'an-pos-002', student_id: 'st-01', text: 'Muestra excelente disposición para apoyar a un compañero con movilidad reducida.', date: '2026-06-25', severity: 'Leve', registered_by: 'Prof. Mariela Sepúlveda', type: 'Positiva' },
  { id: 'an-pos-003', student_id: 'st-01', text: 'Destacada participación en el debate interno de Historia, demostrando respeto por opiniones ajenas.', date: '2026-07-02', severity: 'Leve', registered_by: 'Prof. Sonia Castro', type: 'Positiva' },
  { id: 'an-pos-004', student_id: 'st-01', text: 'Organiza campaña solidaria voluntaria dentro de su curso de manera prolija.', date: '2026-07-05', severity: 'Grave', registered_by: 'Prof. Mariela Sepúlveda', type: 'Positiva' },

  // Benjamín
  { id: 'an-101', student_id: 'st-02', text: 'Asiste a clases sin el uniforme oficial y sin justificación del apoderado.', date: '2026-06-03', severity: 'Leve', registered_by: 'Inspector Sonia Vera', type: 'Negativa' },
  { id: 'an-102', student_id: 'st-02', text: 'No trae los materiales requeridos para el laboratorio de Ciencias.', date: '2026-06-08', severity: 'Leve', registered_by: 'Prof. Carolina Alarcón', type: 'Negativa' },
  { id: 'an-103', student_id: 'st-02', text: 'No trae la agenda escolar institucional por tercera vez consecutiva.', date: '2026-06-11', severity: 'Leve', registered_by: 'Inspectora Sonia Vera', type: 'Negativa' },
  { id: 'an-104', student_id: 'st-02', text: 'Consume alimentos en la sala de computación desobedeciendo instrucciones claras.', date: '2026-06-15', severity: 'Leve', registered_by: 'Prof. Roberto Lagos', type: 'Negativa' },
  { id: 'an-105', student_id: 'st-02', text: 'Deposita basura fuera de los contenedores habilitados en el patio.', date: '2026-06-19', severity: 'Leve', registered_by: 'Inspector Jorge Díaz', type: 'Negativa' },
  { id: 'an-106', student_id: 'st-02', text: 'Se niega a entregar su teléfono celular al ser sorprendido usándolo durante la clase.', date: '2026-06-23', severity: 'Grave', registered_by: 'Prof. Roberto Lagos', type: 'Negativa' },
  { id: 'an-107', student_id: 'st-02', text: 'Falta a la verdad al justificar que un compañero le quitó su cuaderno de evaluaciones.', date: '2026-06-26', severity: 'Grave', registered_by: 'Prof. Roberto Lagos', type: 'Negativa' },
  { id: 'an-108', student_id: 'st-02', text: 'Falta el respeto al profesor de Educación Física gesticulando de mala forma.', date: '2026-06-30', severity: 'Grave', registered_by: 'Prof. Eduardo Neira', type: 'Negativa' },
  { id: 'an-109', student_id: 'st-02', text: 'Agrede verbalmente a un compañero con epítetos vulgares en camarines.', date: '2026-07-02', severity: 'Grave', registered_by: 'Inspector Jorge Díaz', type: 'Negativa' },
  { id: 'an-110', student_id: 'st-02', text: 'Fomenta un desorden masivo en clases de Historia impidiendo hacer la clase.', date: '2026-07-06', severity: 'Grave', registered_by: 'Prof. Sonia Castro', type: 'Negativa' },
  { id: 'an-111', student_id: 'st-02', text: 'Copiar abiertamente desde un torpedo electrónico durante prueba semestral de Física.', date: '2026-07-10', severity: 'Grave', registered_by: 'Prof. Roberto Lagos', type: 'Negativa' },
  { id: 'an-pos-101', student_id: 'st-02', text: 'Obtiene primer lugar regional en la olimpiada de matemáticas.', date: '2026-06-12', severity: 'Muy Grave', registered_by: 'Dirección', type: 'Positiva' },
  { id: 'an-pos-102', student_id: 'st-02', text: 'Representa al curso de forma impecable en el acto cívico del Combate de Iquique.', date: '2026-06-21', severity: 'Leve', registered_by: 'Prof. Roberto Lagos', type: 'Positiva' },
  { id: 'an-pos-103', student_id: 'st-02', text: 'Apoya en tutorías matemáticas a compañeros de menor rendimiento durante recreos.', date: '2026-07-05', severity: 'Grave', registered_by: 'Prof. Roberto Lagos', type: 'Positiva' },

  // Sofía
  { id: 'an-201', student_id: 'st-03', text: 'Llegada tarde a clases después del segundo recreo por quedarse conversando.', date: '2026-06-10', severity: 'Leve', registered_by: 'Inspectora Sonia Vera', type: 'Negativa' },
  { id: 'an-202', student_id: 'st-03', text: 'Presentación personal descuidada, asiste con maquillaje excesivo.', date: '2026-06-15', severity: 'Leve', registered_by: 'Inspectora Sonia Vera', type: 'Negativa' },
  { id: 'an-203', student_id: 'st-03', text: 'No entrega el comunicado firmado de citación a entrevista a tiempo.', date: '2026-06-22', severity: 'Leve', registered_by: 'Prof. Carolina Alarcón', type: 'Negativa' },
  { id: 'an-204', student_id: 'st-03', text: 'Utiliza pertenencias de una compañera de banco sin su consentimiento.', date: '2026-07-01', severity: 'Leve', registered_by: 'Prof. Carolina Alarcón', type: 'Negativa' },
  { id: 'an-205', student_id: 'st-03', text: 'Se le llama la atención verbalmente por interrumpir con risas durante la oración matinal.', date: '2026-07-08', severity: 'Leve', registered_by: 'Prof. Carolina Alarcón', type: 'Negativa' },
  { id: 'an-206', student_id: 'st-03', text: 'Es sorprendida utilizando el teléfono celular en clases de Ciencias bajo la mesa.', date: '2026-07-13', severity: 'Grave', registered_by: 'Prof. Carolina Alarcón', type: 'Negativa' },
  { id: 'an-pos-201', student_id: 'st-03', text: 'Demuestra excelente puntualidad y responsabilidad como presidenta de curso.', date: '2026-06-12', severity: 'Grave', registered_by: 'Prof. Carolina Alarcón', type: 'Positiva' },
  { id: 'an-pos-202', student_id: 'st-03', text: 'Sobresaliente desempeño en la feria de ciencias institucional.', date: '2026-06-28', severity: 'Muy Grave', registered_by: 'Prof. Carolina Alarcón', type: 'Positiva' },
  { id: 'an-pos-203', student_id: 'st-03', text: 'Elegida mejor compañera del mes de Junio por votación unánime de sus pares.', date: '2026-06-30', severity: 'Grave', registered_by: 'Prof. Carolina Alarcón', type: 'Positiva' }
];
