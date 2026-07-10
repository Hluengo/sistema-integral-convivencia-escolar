---
description: Revisa el código modificado buscando bugs, code smell y mejoras
agent: reviewer
---

Revisa los cambios recientes del proyecto. Enfócate en:

1. **Bugs potenciales**: lógica incorrecta, null checks faltantes, edge cases
2. **Code smell**: funciones muy largas, duplicación, naming confuso
3. **Seguridad**: inyección SQL, XSS, secrets expuestos
4. **Rendimiento**: queries N+1, renders innecesarios, memory leaks
5. **Convenciones**: seguir patrones existentes del proyecto

Analiza los archivos modificados y provide sugerencias concretas con líneas específicas.
