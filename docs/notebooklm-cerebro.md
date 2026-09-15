# Cerebro Convivencia (dev) — NotebookLM

Cerebro citado del proyecto sobre Gemini Notebook. El agente lo consulta en vez de
adivinar; el razonamiento pesado corre en Google (cero tokens nuestros).

- Notebook: `Cerebro Convivencia (dev)` (`ba57bd51-10ce-4ded-87ac-1e91ff426683`)
- Cuenta: `hluengo@mmddconcepcion.cl` (CLI `notebooklm`, perfil `default`)
- Fuentes (15, solo docs no sensibles): `README.md`, `.memory/patrones.md`,
  `skills/*/SKILL.md` (5), `docs/adr/*.md` (8).

## Uso

```powershell
$env:PATH += ";$env:APPDATA\Python\Python314\Scripts"
notebooklm use ba57bd51-10ce-4ded-87ac-1e91ff426683
notebooklm ask "tu pregunta sobre arquitectura o patrones"
```

- Al iniciar sesión: un `ask` al cerebro antes de explorar el repo con grep.
- Al terminar: nada que guardar aquí (la memoria viva sigue en `.memory/`).

## Reglas

1. **Nunca** subir casos de estudiantes ni datos personales (los notebooks
   `Caso 8B`, `Caso Renato Agustin`, etc. son de uso personal, fuera de este flujo).
2. Si cambia un ADR o skill, refrescar: `notebooklm source delete -y <id>`
   y re-agregar el archivo (o `notebooklm source refresh` para URLs).
3. Herramienta no oficial (APIs indocumentadas de Google): flujo dev solamente,
   nunca dependencia del servidor en producción.
