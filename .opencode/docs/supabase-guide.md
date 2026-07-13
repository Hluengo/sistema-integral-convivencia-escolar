# Guía: Desarrollo con Supabase

## Configuración

### Environment Variables
```
SUPABASE_URL=https://jjzwwhnofiepvliugowr.supabase.co
SUPABASE_ANON_KEY=... (legacy, HMAC)
SUPABASE_SECRET_KEY=... (ES256)
```

### Cliente Supabase
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

## Autenticación

### Obtener Usuario
```typescript
const { data: { user }, error } = await supabase.auth.getUser();
```

### JWT en API
```typescript
// HMAC first (rápido)
const user = verifyHMAC(token);

// ES256 fallback (Supabase API)
if (!user) {
  user = await verifySupabaseAPI(token);
}
```

## Base de Datos

### Tablas Principales
- `causas` — Casos de convivencia
- `bitacora_entries` — Historial de acciones
- `checklist_items` — Checklist legal
- `document_templates` — Plantillas de documentos
- `profiles` — Perfiles de usuario
- `students` — Estudiantes

### Query Ejemplo
```typescript
const { data, error } = await supabase
  .from('causas')
  .select('*')
  .eq('codigo', codigo);
```

## Storage

### Upload
```typescript
const { data, error } = await supabase.storage
  .from('documentos_convivencia')
  .upload(`${causaId}/${filename}`, file);
```

### URL Firmada
```typescript
const { data } = await supabase.storage
  .from('documentos_convivencia')
  .createSignedUrl(path, 3600); // 1 hora
```

## RLS Policies

### Verificar Policies
```sql
-- Ver policies existentes
SELECT * FROM pg_policies WHERE tablename = 'causas';
```

### Crear Policy
```sql
CREATE POLICY "Usuarios autificados pueden ver causas"
ON causas FOR SELECT
USING (auth.role() = 'authenticated');
```
