---
name: privacy-education
description: Proteccion de datos de estudiantes - RUT, nombres, documentos, datos personales
agent: security-reviewer
---

# Privacy & Education Skill

## Reglas de proteccion

- Nunca incluir RUT, nombres reales o documentos de estudiantes en:
  - Commits
  - Logs de terminal
  - Mensajes de error
  - Fixtures o datos de prueba
  - Capturas de pantalla
- En datos de prueba usar: "Estudiante Generico", "RUT generico"
- Respetar modo privacidad del sistema
- No imprimir datos personales innecesarios en terminal
- Anonimizar datos antes de enviar a APIs de IA
- Buckets de Storage deben tener RLS adecuado

## Verificacion pre-commit

1. `git diff` revisar si hay RUT, nombres completos, documentos
2. Archivos `.env*` no incluidos
3. Datos de prueba sin informacion real
4. Sin capturas de pantalla con datos reales

## Buckets

- `anotaciones` y `disciplinary` deben tener RLS por tenant_id
- No buckets publicos sin autenticacion
