# Domain Glossary — Sistema Integral de Convivencia Escolar

## Entidades del Dominio

| Término | Definición |
|---------|------------|
| **Establecimiento (Tenant)** | Colegio, liceo o escuela. Unidad organizativa del sistema. |
| **Estudiante (Student)** | Alumno matriculado con RUT, curso, nombre completo. |
| **Curso (Course)** | Grupo curso (1A, 2B, etc.). Pertenece a un establecimiento. |
| **Perfil (Profile)** | Usuario del sistema con rol y permisos. |
| **Causa (Case)** | Caso disciplinario con 5 fases y 39 estados. |
| **Anotación (InspectorateRecord)** | Registro de conducta (Positiva/Negativa/Información). |
| **Carta (CartaDisciplinaria)** | Documento formal: Amonestación, Compromiso o Derivación. |
| **Proceso (DisciplinaryProcess)** | Proceso generado desde PDF con anotaciones detectadas. |
| **Regla (DisciplinaryRule)** | Threshold para sugerir tipo de carta según conteo. |

## Glosario de Términos Legales

| Término | Significado |
|---------|-------------|
| **Debido Proceso** | Procedimiento justo: notificación, descargos, revisión, proporcionalidad. |
| **Circular 482** | Normativa de Superintendencia de Educación sobre Reglamentos Internos (2018). |
| **Ley 21.809** | Ley de Convivencia, Buen Trato y Bienestar de Comunidades Educativas (2026). |
| **Aula Segura (Ley 21.128)** | Procedimiento acelerado para faltas gravísimas. |
| **RICE** | Clasificación de conductas: Leve, Grave, Muy Grave, Gravísima. |
| **Descargos** | Derecho del estudiante a presentar su versión de los hechos. |
| **Apelación** | Derecho a solicitar revisión de una medida disciplinaria. |

## Sistema de Fases (Due Process)

| Fase | Estados | Propósito |
|------|---------|-----------|
| Recepción | 3 | Recibir y verificar denuncia |
| Investigación | 6 | Reunir evidencia, entrevistas, informe |
| Resolución | 6 | Determinar medidas, notificar, aplicar |
| Apelación | 5 | Revisión de instancia superior |
| Seguimiento | 4+ | Monitorear cumplimiento, evaluar, cerrar |

## Clasificación RICE

| Severidad | Rango Negativas | Carta Sugerida |
|-----------|----------------|----------------|
| Leve | 0-4 | Sin carta (medidas formativas) |
| Grave | 5-9 | Amonestación Escrita |
| Muy Grave | 10-14 | Compromiso Conductual |
| Gravísima | 15+ | Derivación |

## Roles del Sistema

| Rol | Nivel |
|-----|-------|
| admin | Acceso total |
| direccion | CRUD (excepto delete destructivo) |
| convivencia | CRUD causas, anotaciones, estudiantes |
| inspectoria | CRUD inspectorate_records |
| profesor_jefe | Lectura + escritura limitada a su curso |
| teacher | Lectura básica |
