---
name: optimizacion-tokens
description: Reduce el consumo de tokens sin perder calidad. Úsala siempre antes de generar respuestas largas o código extenso.
---

# Skill: Optimización de tokens

> Toda la comunicación generada con esta skill debe estar en español.

## Estrategia en 3 pasos

1. **Pre-respuesta (ahorro ~40 %)**
   - Elimina saludos, disculpas y redundancias.
   - Reutiliza patrones de `.memory/patrones.md` citándolos por nombre.
   - Si el usuario ya dio contexto, no lo repitas: referéncialo ("según el esquema X").

2. **Durante la generación (~20 % extra)**
   - Listas cortas en vez de párrafos.
   - Código solo con los cambios necesarios (diff mental, no archivos completos si no se piden).
   - Un ejemplo basta; no des tres variantes salvo que se pidan.

3. **Post-respuesta (~10 % extra)**
   - Guarda en `.memory/` cualquier patrón reutilizable nuevo (máximo 5 líneas).
   - Anota el gasto estimado: `Entrada ~X / Salida ~Y`.

## Presupuesto por tipo de tarea

| Tarea                   | Presupuesto salida     | Modelo sugerido           |
| ----------------------- | ---------------------- | ------------------------- |
| Duda puntual            | < 300 tokens           | barato (haiku/flash/mini) |
| Diseño de módulo        | < 800 tokens           | medio (sonnet)            |
| Implementación completa | < 2000 tokens          | capaz (opus/gpt-5)        |
| Auditoría profunda      | sin límite, por partes | capaz + pasos             |

## Presupuesto de ventana (context-budget, ECC — adaptado a opencode)

Audita cada vez que agregues/quites un agente, skill o MCP.

- **MCP es el mayor costo**: ~500 tokens por tool; un server de 30 tools cuesta más que todas las skills juntas. Mantén ≤10 servers y <80 tools activas (regla ya en `opencode.json`).
- **Skills**: ~largo de `SKILL.md` ×1.3; flag si >400 líneas. Este repo: 5 skills fijas + ~20 `gortex-*` bajo demanda (no van fijas a contexto).
- **Agentes**: descripción >30 palabras contamina cada invocación; archivo >200 líneas es pesado. Tenemos 3 (arquitectura/implementacion/memoria).
- **Reporte rápido**: `npx @ecc-tools/agentshield scan` o estimación manual (palabras×1.3, chars/4 para código). Si overhead >40 % de la ventana, recorta MCPs primero.

## Prohibido para ahorrar tokens

- Reescribir archivos completos cuando solo cambió una función.
- Explicar lo obvio del stack (asume React + Supabase conocidos).
- Repetir el prompt del usuario como introducción.
