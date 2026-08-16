---
name: meeting-minutes
description: Prepara agendas, minutas, actas de reuniones y seguimiento de acuerdos. Trigger: reunión, acta, minuta, agenda, acuerdos.
---

# Meeting Minutes

Sistema completo para gestión de reuniones.

## Tipos de Reunión

### PAI (Plan de Asistencia Institucional)
- Participantes: Director, UTP, Jefe UTP, Inspector, Psicólogo
- Frecuencia: Mensual
- Temas: Asistencia, convivencia, evaluación

### PIE (Programa de Integración Escolar)
- Participantes: Coordinador PIE, Psicólogo, Educadora Diferencial, Jefatura
- Frecuencia: Quincenal
- Temas: Adaptaciones, NEE, integración

### Consejo de Profesores
- Participantes: Todo el profesorado
- Frecuencia: Mensual
- Temas: Curricular, evaluación, convivencia

## Estructura de Acta

```markdown
# ACTA DE REUNIÓN

**Fecha:** [fecha]
**Hora:** [hora inicio] - [hora término]
**Lugar:** [lugar]
**Tipo:** [tipo de reunión]

## Participantes
- [nombre] - [cargo]

## Orden del Día
1. [tema 1]
2. [tema 2]

## Desarrollo

### 1. [Tema]
- [discusión]
- [acuerdo]

## Acuerdos
| # | Acuerdo | Responsable | Plazo |
|---|---------|-------------|-------|
| 1 | [acuerdo] | [nombre] | [fecha] |

## Próxima Reunión
- Fecha: [fecha]
- Hora: [hora]
```

## Comandos Relacionados
- `@meeting` para actas
- `@utp` para reuniones pedagógicas
- `@pie` para reuniones PIE
