# Runbook: opencode en español (MCP + skills + plugins + agentes)

> Todo lo informado por el sistema debe estar en español (es-CL).

## 1. Qué se instaló

| Pieza             | Ubicación                                                                     | Descripción                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuración MCP | `opencode.json`                                                               | `gortex` y `supabase` activos. `contexto-docs`, `playwright` y `github` quedan declarados pero deshabilitados para no gastar contexto.                   |
| Instrucciones     | `AGENTS.md`, `docs/agents/opencode-instructions.md`, `.memory/*.md`           | Archivos cargados por `instructions`, sin texto largo embebido en JSON.                                                                                  |
| Skills            | `skills/`                                                                     | Skills locales en español cargadas con `skills.paths`.                                                                                                   |
| Plugins externos  | `opencode.json` → `plugin`                                                    | Solo `@dietrichgebert/ponytail`.                                                                                                                         |
| Agentes (3)       | `opencode.json` → `agent`                                                     | Agentes `arquitectura`, `implementacion` y `memoria` definidos con el schema actual de OpenCode. Los `.agents/*.ts` quedan como referencia local previa. |
| Memoria           | `.memory/config.json`, `.memory/patrones.md`, `.memory/presupuesto-tokens.md` | Patrones reutilizables y presupuesto de 60 000 tokens/sesión.                                                                                            |

## 2. Cómo usarlo (flujo en español)

1. **Duda o diseño**: usa el agente `arquitectura`. Entrega decisión, componentes, riesgos y próximos pasos.
2. **Código**: usa el agente `implementacion`, reutiliza patrones locales y verifica con lint, typecheck o tests proporcionales.
3. **Memoria**: usa el agente `memoria` al cerrar decisiones reutilizables. No guardes secretos ni PII.
4. **MCP**: deja activos solo los necesarios para la sesión. `supabase` usa OAuth remoto; `contexto-docs`, `playwright` y `github` están disponibles pero deshabilitados.

## 3. Ahorro de tokens esperado

- Pre-respuesta (plantillas, citar memoria): ~40 %.
- Modelo según complejidad (haiku → sonnet → opus): ~20 % extra.
- Carga perezosa de plugins + MCP opcionales: ~10 % extra.
- **Total estimado: 55-70 %** frente a prompts libres sin skills ni memoria.

## 4. Verificación

```bash
npm run lint
npm run typecheck
npx tsc --noEmit
```

## 5. Secretos necesarios (en `.env.local`, nunca en código)

- `CONTEXT7_API_KEY`: solo para MCP `contexto-docs`.
- `GITHUB_PERSONAL_ACCESS_TOKEN`: solo para MCP `github`.
