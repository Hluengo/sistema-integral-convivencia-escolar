---
name: memoria-contexto
description: Gestiona la memoria persistente en .memory/ para no repetir contexto y ahorrar tokens entre sesiones.
---

# Skill: Memoria y contexto

> Toda la memoria almacenada y los reportes deben estar en español.

## Dónde vive la memoria

- `.memory/patrones.md`: decisiones y patrones reutilizables (citar por nombre, no reescribir).
- `.memory/presupuesto-tokens.md`: presupuesto y gasto por sesión.
- `.memory/config.json`: límites y estrategia activa.

## Continuidad entre sesiones

- `.memory/sesion-actual.md`: estado vivo de la sesión (En curso / Completado / Notas para la próxima). Al iniciar, léelo; al terminar, actualízalo. Patrón tomado de `everything-claude-code` (session-start/end hooks), adaptado sin hooks: lo mantiene el agente de memoria.
- `.memory/patrones.md`: solo lo ya validado y reutilizable (máx. 5 líneas por entrada).

## Ciclo de memoria (tomado de jcode MEMORY_ARCHITECTURE — adaptado sin embeddings)

Inspirado en jcode (memoria multi-capa con sidecar async): acá sin vectores, solo convención + agente.

- **Extracción**: al terminar una tarea con decisión reutilizable, el agente de memoria guarda 1 entrada en `.memory/patrones.md` (máx. 5 líneas). No dupliques: detecta por nombre.
- **Consolidación**: cada 5 sesiones o al notar contradicción/duplicado, el agente fusiona o marca `superseded_by` / `obsoleta`.
- **Confianza**: entradas tipo `corrección` no decaen; `hecho` con 30 días sin uso se marca para revisar (ver `MEMORY_ARCHITECTURE.md` de jcode para half-lives de referencia).
- **Asíncrono**: la extracción no bloquea la tarea en curso; el agente la hace al cerrar la sesión (`.memory/sesion-actual.md` → `.memory/patrones.md`).

## Reglas

1. **Leer antes de preguntar**: antes de pedir contexto al usuario, busca en `.memory/` y en `skills/`.
2. **Escribir poco y útil**: cada entrada máximo 5 líneas: `fecha | tema | decisión | motivo`.
3. **Citar, no copiar**: en las respuestas usa "según el patrón X" en vez de pegar el patrón completo.
4. **Podar**: si una entrada deja de ser válida, márcala como obsoleta en vez de borrar historial útil.
5. **Presupuesto**: si la sesión supera el 80 % del presupuesto (`config.json`), avisa en español y propone continuar por partes o resumir contexto.
6. **No memorizar secretos**: nunca guardes API keys, tokens ni PII. Solo decisiones y patrones.

## Formato de reporte de tokens (siempre en español)

```text
Tokens de la operación — Entrada ~X | Salida ~Y | Ahorro estimado ~Z %.
Estrategia aplicada: <citar skill o patrón>.
```
