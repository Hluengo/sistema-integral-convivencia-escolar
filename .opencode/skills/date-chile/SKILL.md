---
name: date-chile
description: Reglas obligatorias para manejo de fechas en America/Santiago
agent: implementer
---

# Date Chile Skill

## Reglas obligatorias

1. Toda fecha civil debe calcularse en **America/Santiago**
2. Usar `date-fns-tz` con zona horaria explicita
3. **Prohibido**: `new Date().toISOString().split('T')[0]` para fechas civiles
4. Almacenar timestamps en UTC, convertir a Chile solo para presentacion
5. Diferenciar entre:
   - `created_at` (timestamp UTC - cuando ocurrio en servidor)
   - `fecha_civil` (date - que dia civil es en Chile, independiente de UTC)

## Casos borde a probar

- 23:00 UTC del dia X = 20:00 Chile (mismo dia civil)
- 03:00 UTC del dia X = 00:00 Chile (mismo dia civil, madrugada)
- 04:00 UTC del dia X = 01:00 Chile (mismo dia civil)
- Noche UTC puede caer en dia ANTERIOR en Chile
- Cambios por horario de verano/invierno

## Codigo seguro

```typescript
import { toZonedTime, format } from 'date-fns-tz';
const TZ = 'America/Santiago';
const now = new Date();
const civilDate = format(toZonedTime(now, TZ), 'yyyy-MM-dd', { timeZone: TZ });
```

## Verificacion

- `npm run test` (incluye dateUtils.test.ts)
- Pruebas para bordes de horario chileno
