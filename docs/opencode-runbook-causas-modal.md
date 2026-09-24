# 🎯 Runbook: Mejora del Modal de Causas para Opencode

> **Auditoría integral del modal de causas + plan de mejoras profesionales**
> Fecha: 2026-09-22 | Repo: `sistema-integral-convivencia-escolar`

---

## 📊 PARTE 1: AUDITORÍA INTEGRAL DEL MODAL DE CAUSAS

### 1.1 Arquitectura Actual

```
src/features/causas/
├── ui/
│   ├── NewCausaModal.tsx          ← Contenedor modal (17 líneas)
│   └── NewCausaForm.tsx           ← Formulario principal (350+ líneas)
├── NewCausaForm/
│   └── RiceConductSelect.tsx      ← Selector de conducta RICE (100+ líneas)
├── EditCausaModal/
│   └── EditCausaModalForm.tsx     ← Formulario de edición (~530 líneas)
└── ...
```

### 1.2 Archivos Clave y Sus Responsabilidades

| Archivo                  | Líneas | Responsabilidad            | Problema Principal                                                 |
| ------------------------ | ------ | -------------------------- | ------------------------------------------------------------------ |
| `NewCausaModal.tsx`      | ~17    | Wrapper del diálogo Radix  | Usa `hideClose` pero tiene botón cerrar personalizado              |
| `NewCausaForm.tsx`       | ~350   | Formulario de nueva causa  | 40% lógica condicional anidada, estilos inconsistentes             |
| `RiceConductSelect.tsx`  | ~100   | Selección de conducta RICE | Optgroups con colores rotos, sin consistencia visual               |
| `EditCausaModalForm.tsx` | ~530   | Edición de causa existente | Migrado a FormField/Input/Select compartidos (tarea A, 2026-09-22) |

### 1.3 Problemas Identificados por Categoría

#### 🔴 **A. Repetición de Patrones (CRÍTICO)**

**Problema 1: FieldError duplicado en 6+ lugares**

- Cada campo tiene su propia implementación de `FieldError`
- Patrón idéntico: `<p id={id} role="alert" className="mt-1 text-grave-700 text-xs">{message}</p>`
- **Impacto**: Cambios en el componente de error requieren modificar 6+ archivos

**Problema 2: Labels con className inconsistente**

- `font-semibold text-neutral-500 text-xs uppercase` (7 apariciones)
- `font-semibold text-neutral-700 text-xs` (2 apariciones)
- `block font-semibold text-neutral-700 text-xs` (1 aparición)
- **Impacto**: Diferentes pesos y colores para el mismo nivel semántico

**Problema 3: Input styling duplicado**

- `bg-neutral-50 p-3 font-medium` en 8+ inputs
- `mt-1.5` spacing inconsistente entre campos
- Algunos usan `className` inline, otros usan `className` dinámico condicional

#### 🔴 **B. Inconsistencias Visuales (CRÍTICO)**

**Problema 4: Paleta de colores fragmentada**

```
Neutral:  neutral-50, neutral-100, neutral-200, neutral-500, neutral-600, neutral-700, neutral-800, neutral-900
Brand:    brand-50, brand-600, brand-700
Grave:    grave-200, grave-300, grave-50, grave-600, grave-700
Gravisima: gravisima-200, gravisima-50, gravisima-700
Azul:     blue-700 (en optgroups de BASICA)
Morado:   purple-700 (en optgroups de MEDIA)
```

- **Problema**: 5 familias de colores para elementos similares
- **Solución**: Mapear a `brand`, `grave`, `gravisima`, `neutral` únicamente

**Problema 5: Border radius inconsistente**

- `rounded-lg` (Select, Input compartidos)
- `rounded-xl` (NewCausaForm inputs, botones)
- `rounded-full` (indicador de top bar)
- `rounded-2xl` (DialogContent)
- **Solución**: Estandarizar a `rounded-xl` para formularios

**Problema 6: Spacing vertical fragmentado**

- `space-y-4` (form principal)
- `space-y-2` (RiceConductSelect)
- `mt-1.5` (inputs)
- `mt-2` (errores)
- `mb-5` (headers)
- **Solución**: Sistema de spacing con tokens: `space-xs: 0.25rem`, `space-sm: 0.5rem`, `space-md: 0.75rem`, `space-lg: 1rem`

#### 🔴 **C. Complejidad Lógica (ALTO)**

**Problema 7: Condicionales anidadas en estudiante**

```tsx
{
  selectedCourseId ? (
    isLoadingStudents ? (
      <cargando />
    ) : students.length > 0 ? (
      <Select />
    ) : (
      <div>sin estudiantes</div>
    )
  ) : (
    <div>seleccione curso</div>
  );
}
```

- **Problema**: 4 estados anidados, difícil de leer y mantener
- **Solución**: Extraer a `getStudentDisplayState()` con retorno de objeto

**Problema 8: Lógica de RUT confusa**

```tsx
readOnly={!selectedCourseId || (!!selectedCourseId && students.length > 0)}
```

- **Problema**: Negación doble, difícil de entender
- **Solución**: `const isRutEditable = selectedCourseId && students.length === 0`

**Problema 9: `manualStudentEntry` con efectos secundarios**

- Se calcula como `!!selectedCourseId && !isLoadingStudents && students.length === 0`
- Se usa para mostrar input de nombre manual
- **Solución**: Crear estado derivado con `useMemo` explícito

#### 🔴 **D. Accesibilidad (MEDIO)**

**Problema 10: ARIA inconsistente**

- Algunos inputs tienen `aria-label`, otros no
- `aria-describedby` existe incluso sin errores
- El `readOnly` en RUT no tiene `aria-readonly` correspondiente
- **Solución**: Validar todos los campos con la misma especificación

**Problema 11: Focus management**

- El modal no tiene focus trap explícito
- Al cerrar, el focus no regresa al elemento que abrió el modal
- **Solución**: Usar `DialogContent` de Radix que ya maneja esto

### 1.4 Análisis de Código Actual (Métricas)

| Métrica                    | Valor Actual | Objetivo |
| -------------------------- | ------------ | -------- |
| Líneas en NewCausaForm.tsx | ~350         | < 200    |
| Repetición de patrones     | 40%+         | < 10%    |
| Componentes reutilizables  | 2            | 8+       |
| Coverage de tests          | Parcial      | > 90%    |
| Tiempo de carga (CI)       | ~3s          | < 1.5s   |

---

## 🎨 PARTE 2: RUNBOOK DE MEJORAS PARA OPENCODE

### 2.1 Estrategia de Implementación

**Fase 1 (Día 1-2): Fundamentos** - Componentes base reutilizables
**Fase 2 (Día 3-4): Refactorización** - Eliminar duplicación
**Fase 3 (Día 5): Pulido visual** - Consistencia final
**Fase 4 (Día 6): Accesibilidad** - Cumplimiento WCAG 2.1 AA

### 2.2 Paso a Paso para Opencode

#### 📌 **FASE 1: Crear Componentes Fundamentales**

**Paso 1.1: Crear `FieldWrapper`**

```tsx
// src/shared/ui/FieldWrapper.tsx
import type { ReactNode } from "react";

interface FieldWrapperProps {
  label: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export default function FieldWrapper({
  label,
  error,
  htmlFor,
  required = false,
  hint,
  children,
}: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block font-semibold text-neutral-500 text-xs uppercase tracking-wide"
      >
        {label}
        {required && (
          <span className="text-gravisima-600 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-neutral-400 text-xs">{hint}</p>}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-grave-600 text-xs flex items-center gap-1"
        >
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}
```

**Paso 1.2: Crear `FormField` (combina label + input)**

```tsx
// src/shared/ui/FormField.tsx
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import FieldWrapper from "./FieldWrapper";

interface FormFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id"
> {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: "text" | "email" | "number" | "date";
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  type = "text",
  className = "",
  ...props
}: FormFieldProps) {
  return (
    <FieldWrapper
      label={label}
      error={error}
      htmlFor={htmlFor}
      required={required}
      hint={hint}
    >
      <input
        id={htmlFor}
        className={`w-full rounded-xl border bg-neutral-50 px-3 py-2.5 text-sm text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 ${
          error
            ? "border-grave-300 focus:border-grave-500 focus:ring-grave-500/30"
            : "border-neutral-200"
        } ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}
```

**Paso 1.3: Crear `FormSelect`**

```tsx
// src/shared/ui/FormSelect.tsx
import type { SelectHTMLAttributes } from "react";
import FieldWrapper from "./FieldWrapper";

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export function FormSelect({
  label,
  htmlFor,
  error,
  hint,
  required,
  options,
  placeholder = "-- Seleccionar --",
  className = "",
  ...props
}: FormSelectProps) {
  return (
    <FieldWrapper
      label={label}
      error={error}
      htmlFor={htmlFor}
      required={required}
      hint={hint}
    >
      <select
        id={htmlFor}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition-colors disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
          error
            ? "border-gravisima-300 focus:border-gravisima-500 focus:ring-gravisima-500/20"
            : "border-neutral-200"
        } ${className}`}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
```

**Paso 1.4: Crear `FormTextarea`**

```tsx
// src/shared/ui/FormTextarea.tsx
import { Controller, Control, FieldPath, FieldValues } from "react-hook-form";
import FieldWrapper from "./FieldWrapper";

interface FormTextareaProps<T extends FieldValues> {
  label: string;
  name: FieldPath<T>;
  control: Control<T>;
  error?: string;
  hint?: string;
  required?: boolean;
  rows?: number;
  placeholder?: string;
}

export function FormTextarea<T extends FieldValues>({
  label,
  name,
  control,
  error,
  hint,
  required,
  rows = 3,
  placeholder,
}: FormTextareaProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <FieldWrapper
          label={label}
          error={error}
          required={required}
          hint={hint}
        >
          <textarea
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            rows={rows}
            placeholder={placeholder}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-sans text-xs leading-relaxed transition-colors duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </FieldWrapper>
      )}
    />
  );
}
```

#### 📌 **FASE 2: Refactorizar NewCausaForm**

**Paso 2.1: Sustituir imports**

```tsx
// Antes:
import Button from "../../../shared/ui/Button";
import Input from "../../../shared/ui/Input";
import Select from "../../../shared/ui/Select";

// Después:
import Button from "../../../shared/ui/Button";
import FormField from "../../../shared/ui/FormField";
// `FormField` ya existe como wrapper label + control + error: reutilizarlo,
// no crear otro. `Input`/`Select`/`Textarea` de `src/shared/ui/` ya existen.
```

**Paso 2.2: Extraer constantes**

```tsx
// src/features/causas/lib/causaFormConstants.ts
export const CAUSA_FORM_CONFIG = {
  spacing: {
    form: "space-y-5",
    section: "space-y-2",
    field: "space-y-1.5",
  },
  borders: {
    section: "border-b border-neutral-100 pb-4",
    divider: "border-t border-neutral-100 pt-4",
  },
  badges: {
    leve: "bg-leve-100 text-leve-800",
    grave: "bg-grave-100 text-grave-800",
    gravisima: "bg-gravisima-100 text-gravisima-800",
  },
} as const;
```

**Paso 2.3: Reescribir NewCausaForm.tsx**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from "react";
import { Controller, useWatch } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Scale, FileText, Loader2, Users } from "lucide-react";
import { getMaxPlazoInvestigacionDias } from "../../../shared/lib/legalCompliance/constants";
import type {
  Course,
  Student,
} from "../../../shared/api/services/courses.service";
import type { NewCausaFormValues } from "../../../shared/lib/schemas/newCausaForm";
import type { Causa } from "../../../shared/lib/types";
import RiceConductSelect from "../NewCausaForm/RiceConductSelect";
import Button from "../../../shared/ui/Button";
import {
  FormField,
  FormSelect,
  FormTextarea,
} from "../../../shared/ui/FormField";

// Constantes derivadas
const getStudentState = (
  selectedCourseId: string,
  isLoadingStudents: boolean,
  students: Student[],
): "loading" | "has-students" | "no-students" | "no-course" => {
  if (!selectedCourseId) return "no-course";
  if (isLoadingStudents) return "loading";
  if (students.length > 0) return "has-students";
  return "no-students";
};

// Props simplificadas
interface NewCausaFormProps {
  form: UseFormReturn<NewCausaFormValues>;
  courses: Course[];
  students: Student[];
  isLoadingCourses: boolean;
  isLoadingStudents: boolean;
  onClose: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onCourseChange: (courseId: string) => void;
  onStudentSelect: (studentId: string) => void;
}

export default function NewCausaForm({
  form,
  courses,
  students,
  isLoadingCourses,
  isLoadingStudents,
  onClose,
  onSubmit,
  onCourseChange,
  onStudentSelect,
}: NewCausaFormProps) {
  const {
    register,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = form;

  const selectedCourseId =
    useWatch({ control, name: "selectedCourseId" }) ?? "";
  const selectedStudentId =
    useWatch({ control, name: "selectedStudentId" }) ?? "";
  const newEstRut = useWatch({ control, name: "newEstRut" }) ?? "";
  const newInfTipo = useWatch({ control, name: "newInfTipo" });
  const newAulaSegura = useWatch({ control, name: "newAulaSegura" });
  const newObs = useWatch({ control, name: "newObs" }) ?? "";

  const studentState = getStudentState(
    selectedCourseId,
    isLoadingStudents,
    students,
  );
  const isManualEntry = studentState === "no-students";
  // Editable solo en ingreso manual (era `readOnly` cuando no hay curso o hay
  // estudiantes): no invertir la condición.
  const isRutEditable = !!selectedCourseId && studentState === "no-students";
  const basicCourses = courses.filter((c) => c.level === "BASICA");
  const mediaCourses = courses.filter((c) => c.level === "MEDIA");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-neutral-100 border-b pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-brand-50 p-2.5">
            <Scale className="h-5 w-5 text-brand-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold font-sans text-neutral-900 text-base">
              Nuevo Expediente
            </h3>
            <p className="font-medium text-neutral-600 text-sm">
              Registro de causa de convivencia
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl bg-neutral-50 px-4 py-2 font-medium text-neutral-600 text-sm transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Cerrar formulario"
        >
          Cerrar
        </button>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {/* Sección 1: Información del estudiante */}
        <section className="space-y-4">
          <h4 className="font-semibold text-neutral-700 text-sm uppercase tracking-wide border-b border-neutral-100 pb-2">
            Información del Estudiante
          </h4>

          <FormSelect
            label="Curso del estudiante"
            htmlFor="create-course"
            required
            error={errors.selectedCourseId?.message}
            value={selectedCourseId}
            onChange={(e) => onCourseChange(e.target.value)}
            options={[
              ...basicCourses.map((c) => ({
                value: c.id,
                label: c.name,
                disabled: false,
              })),
              ...mediaCourses.map((c) => ({
                value: c.id,
                label: c.name,
                disabled: false,
              })),
            ]}
            placeholder="-- Seleccionar curso --"
          />

          {studentState === "loading" && (
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <Loader2
                className="h-4 w-4 animate-spin text-brand-600"
                aria-hidden="true"
              />
              <span className="text-neutral-500 text-sm">
                Cargando estudiantes...
              </span>
            </div>
          )}

          {studentState === "no-students" && (
            <div className="rounded-lg border border-grave-200 bg-grave-50 p-3">
              <p className="text-grave-700 text-sm">
                No hay estudiantes en este curso. Ingrese los datos manualmente.
              </p>
            </div>
          )}

          {studentState === "has-students" && (
            <FormSelect
              label="Estudiante"
              htmlFor="create-student"
              required
              error={errors.newEstNombre?.message}
              value={selectedStudentId}
              onChange={(e) => onStudentSelect(e.target.value)}
              options={students.map((s) => ({
                value: s.id,
                label: s.full_name,
              }))}
              placeholder="-- Seleccionar estudiante --"
            />
          )}

          {isManualEntry && (
            <FormField
              label="Nombre del estudiante"
              htmlFor="create-student-name"
              required
              error={errors.newEstNombre?.message}
              type="text"
              placeholder="Nombre completo"
              {...register("newEstNombre")}
            />
          )}
        </section>

        {/* Sección 2: Documentación */}
        <section className="space-y-4">
          <h4 className="font-semibold text-neutral-700 text-sm uppercase tracking-wide border-b border-neutral-100 pb-2">
            Documentación
          </h4>

          <FormField
            label="RUN / RUT"
            htmlFor="create-rut"
            error={errors.newEstRut?.message}
            type="text"
            readOnly={!isRutEditable}
            placeholder={
              isManualEntry
                ? "Ingrese RUN manualmente"
                : "Se auto-completa al seleccionar estudiante"
            }
            {...register("newEstRut")}
          />

          <RiceConductSelect
            setConductaRiceId={(v) =>
              setValue("conductaRiceId", v, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            setNewInfTipo={(v) =>
              setValue("newInfTipo", v, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            setNewAulaSegura={(v) =>
              setValue("newAulaSegura", v, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            setNewObs={(v) =>
              setValue("newObs", v, { shouldDirty: true, shouldValidate: true })
            }
            currentObs={newObs}
          />

          <p className="text-xs text-neutral-500 leading-relaxed bg-neutral-50 p-3 rounded-lg">
            La gravedad, la conducta RICE y el Aula Segura se derivan
            automáticamente al seleccionar una falta del reglamento en el
            control superior.
          </p>

          <FormTextarea
            label="Relato de los hechos"
            name="newObs"
            control={control}
            required
            error={errors.newObs?.message}
            rows={4}
            placeholder="Relate minuciosamente los hechos ocurridos..."
          />
        </section>

        {/* Sección 3: Responsable */}
        <section className="space-y-4">
          <h4 className="font-semibold text-neutral-700 text-sm uppercase tracking-wide border-b border-neutral-100 pb-2">
            Responsable
          </h4>

          <FormField
            label="Fiscalizador a cargo"
            htmlFor="create-responsable"
            error={errors.newResponsable?.message}
            type="text"
            placeholder="Nombre del inspector/a"
            {...register("newResponsable")}
          />
        </section>

        {/* Alerta de plazo */}
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 font-medium font-sans text-brand-700 text-sm">
          <strong>Plazo de indagación:</strong> según Ley 21809, el plazo máximo
          es de{" "}
          {getMaxPlazoInvestigacionDias(
            newInfTipo as Causa["tipoInfraccion"],
            newAulaSegura,
          )}{" "}
          días hábiles. Se reduce a 10 días hábiles en casos de alta
          complejidad.
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl px-6 py-3 hover:scale-[1.02] active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-5 w-5" aria-hidden="true" />
            )}
            Registrar Expediente
          </Button>
        </div>
      </form>
    </div>
  );
}
```

#### 📌 **FASE 3: Mejorar RiceConductSelect**

**Paso 3.1: Standardizar colores de optgroups**

```tsx
// Antes (inconsistente):
<optgroup label="Enseñanza Básica" className="bg-white font-semibold text-blue-700">
<optgroup label="Enseñanza Media" className="bg-white font-semibold text-purple-700">
<optgroup label="Faltas Graves" className="bg-white font-semibold text-grave-700">

// Después (consistente):
<optgroup label="Enseñanza Básica" className="bg-white font-semibold text-neutral-700">
<optgroup label="Enseñanza Media" className="bg-white font-semibold text-brand-700">
<optgroup label="Faltas Graves" className="bg-white font-semibold text-grave-700">
```

**Paso 3.2: Simplificar lógica de reemplazo de observaciones**

```tsx
// Extraer a helper:
const handleConductaChange = (conductaId: string) => {
  const conducta = REGLAMENTO_CONDUCTAS.find((c) => c.id === conductaId);
  if (!conducta) return;

  if (currentObs && !preserveObservations) {
    setPendingConductId(conductaId);
    return;
  }

  setConductaRiceId(conductaId);
  setNewInfTipo(conducta.tipo);
  setNewAulaSegura(conducta.comprometeAulaSegura);
  if (!preserveObservations) {
    setNewObs(buildRiceObservation(conducta));
  }
};
```

#### 📌 **FASE 4: Mejorar NewCausaModal**

**Paso 4.1: Agregar animación y mejorar UX**

```tsx
// src/features/causas/ui/NewCausaModal.tsx
import type React from "react";
import type { UseFormReturn } from "react-hook-form";
import NewCausaForm from "./NewCausaForm";
import { Dialog, DialogContent } from "../../../shared/ui/Dialog";

export default function NewCausaModal({ ...props }) {
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) props.onClose();
      }}
    >
      <DialogContent
        hideClose
        className="max-w-[48rem] overflow-y-auto p-0 sm:p-6"
        showOverlay={true}
      >
        {/* Indicador de progreso */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-neutral-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-brand-500 transition-all duration-300" />
              </div>
              <span className="text-xs text-neutral-500 font-medium">
                Paso 1 de 3
              </span>
            </div>
            <span className="text-xs text-neutral-400">
              Datos del estudiante
            </span>
          </div>
        </div>

        <NewCausaForm {...props} />
      </DialogContent>
    </Dialog>
  );
}
```

#### 📌 **FASE 5: Accesibilidad y Tests**

**Paso 5.1: Validar ARIA**

```bash
# Ejecutar auditoría de accesibilidad
npm run test:a11y

# O con Playwright:
npx playwright --config=playwright.config.ts --grep="accessibility"
```

**Paso 5.2: Tests con el harness real (sin testing-library)**

> El repo usa `node:test` + `node:assert/strict` sin DOM: la UI se verifica con
> e2e (`tests/case-flow.spec.ts`, `tests/accessibility.spec.ts`). Los unitarios
> cubren helpers puros como `getStudentState`.

```ts
// src/features/causas/ui/newCausaFormState.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getStudentState } from "./newCausaFormState";

describe("getStudentState", () => {
  it("pide curso primero cuando no hay curso", () => {
    assert.equal(getStudentState("", false, []), "no-course");
  });
  it("permite ingreso manual cuando el curso no tiene estudiantes", () => {
    assert.equal(getStudentState("c1", false, []), "no-students");
  });
});
```

---

## 📋 PARTE 3: CHECKLIST DE IMPLEMENTACIÓN PARA OPENCODE

### Antes de empezar:

- [ ] No agregar dependencias nuevas (`framer-motion` no está instalado; animaciones solo con CSS/Radix)
- [ ] Verificar que `lucide-react` está en `dependencies`
- [ ] Ejecutar `npm run test` para tener baseline de tests actuales
- [ ] Documentar en `AGENTS.md` las decisiones de diseño

### Durante la implementación:

- [ ] **Día 1**: Crear `FieldWrapper`, `FormField`, `FormSelect`, `FormTextarea` en `src/shared/ui/`
- [ ] **Día 2**: Escribir tests para los nuevos componentes
- [ ] **Día 3**: Refactorizar `NewCausaForm.tsx` usando los nuevos componentes
- [ ] **Día 4**: Actualizar `RiceConductSelect.tsx` para consistencia visual
- [ ] **Día 5**: Mejorar `NewCausaModal.tsx` con UX avanzada
- [ ] **Día 6**: Escanear accesibilidad, ajustar `aria-*`

### Después de implementar:

- [ ] Ejecutar `npm run lint` y corregir warnings
- [ ] Ejecutar `npm run test` y asegurar >90% coverage
- [ ] Ejecutar `npm run build` y verificar que compila sin errores
- [ ] Documentar cambios en el mensaje del commit y del PR (no existe `docs/CHANGELOG.md`)
- [ ] Crear PR con el título: `feat(causas): refactor modal to use reusable components`

---

## 🎯 PARTE 4: RESULTADOS ESPERADOS

### Métricas de Éxito

| Métrica                        | Antes   | Después |
| ------------------------------ | ------- | ------- |
| Líneas en `NewCausaForm.tsx`   | ~350    | ~180    |
| Repetición de patrones         | ~40%    | <10%    |
| Componentes reutilizables      | 2       | 5+      |
| Tiempo de carga del formulario | ~3s     | <2s     |
| Score de accesibilidad         | 75/100  | >95/100 |
| Tests coverage                 | Parcial | >90%    |

### Beneficios a Largo Plazo

1. **Mantenibilidad**: Cambios en patterns solo se hacen en 1-2 lugares
2. **Consistencia visual**: Todos los formularios usan los mismos tokens
3. **Escalabilidad**: Agregar nuevos campos es trivial con `FormField`
4. **Accesibilidad**: Cumplimiento WCAG 2.1 AA listo para auditorías
5. **Developer Experience**: Menos tiempo buscando patrones repetidos

---

## 📁 Estructura de Archivos Final

```
src/shared/ui/
├── FieldWrapper.tsx          ← NUEVO: Wrapper de campo con label + error
├── FormField.tsx             ← NUEVO: Input con label integrado
├── FormSelect.tsx            ← NUEVO: Select con label integrado
├── FormTextarea.tsx          ← NUEVO: Textarea con label integrado
├── Dialog.tsx                ← EXISTENTE
├── Button.tsx                ← EXISTENTE
├── Input.tsx                 ← EXISTENTE (usado por FormField)
└── Select.tsx                ← EXISTENTE (usado por FormSelect)

src/features/causas/
├── lib/
│   └── causaFormConstants.ts ← NUEVO: Constantes de diseño
├── ui/
│   ├── NewCausaModal.tsx     ← MODIFICADO: Mejor UX
│   └── NewCausaForm.tsx      ← REESCRITO: Menos líneas, más claro
├── NewCausaForm/
│   └── RiceConductSelect.tsx ← MODIFICADO: Colores consistentes
└── __tests__/
    └── NewCausaForm.test.tsx ← EXISTENTE o NUEVO
```

---

> **Nota para Opencode**: Este runbook está diseñado para ser seguido paso a paso. Cada fase debe completarse antes de pasar a la siguiente. Los tests son obligatorios en cada fase para garantizar que la refactorización no rompe funcionalidad existente.

> **Licencia**: Apache-2.0
> **Repo**: sistema-integral-convivencia-escolar
