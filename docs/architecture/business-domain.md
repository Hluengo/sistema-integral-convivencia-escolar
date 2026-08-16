# Business Domain — Sistema Integral de Convivencia Escolar

## Usuarios y Roles

| Rol | Descripción | Permisos Clave |
|-----|------------|----------------|
| `admin` | Administrador del establecimiento | CRUD completo en todo el tenant |
| `direccion` | Equipo directivo | CRUD (excepto delete destructivo) |
| `convivencia` | Encargado de convivencia escolar | CRUD en causas, anotaciones, estudiantes |
| `inspectoria` | Inspectoría | CRUD en inspectorate_records, estudiantes |
| `profesor_jefe` | Profesor jefe de curso | Lectura + escritura limitada a su curso |
| `teacher` | Docente | Lectura básica |
| `inspector` | Inspector | CRUD básico |
| `user` | Usuario base | Lectura básica |
| `staff` | Staff genérico | CRUD en causas |

## Entidades del Dominio

### Establecimiento (Tenant)
- Unidad organizacional: colegio, liceo, escuela
- Alcance: todos los datos están aislados por tenant_id

### Curso (Course)
- Pertenece a un tenant
- Agrupa estudiantes para filtrado y reportes

### Estudiante (Student)
- Pertenece a un curso y un tenant
- Tiene RUT, nombre completo, análisis AI (JSONB con metadata)
- Puede tener múltiples anotaciones, cartas, etapas, procesos disciplinarios

### Anotación (InspectorateRecord)
- Registro individual de conducta del estudiante
- **Tipo**: Positiva, Negativa, Información
- **Severidad (RICE)**: Leve, Grave, Muy Grave, Gravísima
- Puede tener un PDF adjunto

### Causa (Caso Disciplinario)
- Contenedor de un proceso disciplinario completo
- Tiene 39 estados organizados en 5 fases procedimentales
- Incluye bitácora de acciones y checklist de debido proceso

### Carta Disciplinaria (CartaDisciplinaria)
- **Tipos**: Amonestación Escrita, Carta de Compromiso Conductual
- **Estados**: Vigente, Cumplida, Incumplida, Anulada
- Incluye datos del apoderado y supervisor

### Proceso Disciplinario (DisciplinaryProcess)
- Generado desde PDF (wizard de anotaciones)
- Estados: draft, pending, approved, rejected, closed
- Incluye anotaciones detectadas y archivos adjuntos

### Regla Disciplinaria (DisciplinaryRule)
- Define thresholds para sugerir tipo de carta
- Basada en conteo de anotaciones negativas/positivas/informativas

## Flujo de Debido Proceso

```
1. RECEPCIÓN
   ├── Denuncia recibida → Verificación preliminar → Apertura formal
   │
2. INVESTIGACIÓN
   ├── Notificación apertura → Entrevista descargos → Recopilación evidencias
   └── Informe cierre indagación → Análisis jurídico → Vista fiscal
   │
3. RESOLUCIÓN
   ├── Propuesta resolución → Revisión dirección → Notificación
   └── Aplicación medidas → Registro → Cierre resolución
   │
4. APELACIÓN
   └── Notificación apelación → Revisión → Resolución → Notificación → Aplicación
   │
5. SEGUIMIENTO
   └── Plan seguimiento → Monitoreo → Evaluación → Cierre formal
```

## Sistema RICE (Clasificación de Conductas)

| Severidad | Ejemplos | Medidas Típicas |
|-----------|---------|-----------------|
| Leve | LLegar atrasado, no llevar materiales | Diálogo formativo, registro |
| Grave | Injurias, daños menores | Amonestación escrita, citación apoderado |
| Muy Grave | Agresión psicológica, hurto | Compromiso conductual, suspensión ≤15 días |
| Gravísima | Agresión física grave, drogas (Ley Aula Segura) | Derivación, posible cancelación |

## Reglas de Cartas por Conteo

| Rango Negativas | Carta Sugerida | Prioridad |
|----------------|----------------|-----------|
| 0-4 | Sin carta | 1 |
| 5-9 | Amonestación Escrita | 2 |
| 10-14 | Compromiso Conductual | 3 |
| 15+ | Derivación | 4 |
