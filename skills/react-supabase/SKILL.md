---
name: react-supabase
description: Patrones de implementación React + Supabase de este repo. Úsala al crear componentes, hooks, formularios o consultas a Supabase.
---

# Skill: React + Supabase (patrones del repo)

> Todo el código y explicaciones generados con esta skill deben estar en español (nombres técnicos en inglés, comentarios y mensajes en español).

## Datos (servidor)

- Usa `@tanstack/react-query` para lecturas (`useQuery`) y mutaciones (`useMutation`).
- Clave de caché con tenant: `['tenant', tenantId, 'recurso', params]`.
- Nunca uses la service-role key en el frontend. Solo `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Formularios

- `react-hook-form` + `zod` con `zodResolver`. Mensajes de validación en español.
- Deshabilita el botón mientras `isPending`. Muestra el error del servidor en español.

## Estado cliente

- `zustand` solo para UI efímera (filtros, wizard, sidebar). Los datos persistentes van a react-query.

## Componentes UI

- Reutiliza `src/components/` existentes antes de crear nuevos.
- Accesibilidad: labels asociados, foco visible, contraste, `aria-*` donde corresponda.
- Iconos con `lucide-react`, estilos con Tailwind 4.

## Ejemplo mínimo (mutación con tenant)

```tsx
// Mensajes al usuario siempre en español
const mutacion = useMutation({
  mutationFn: (datos: NuevoCaso) => crearCaso(tenantId, datos),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["tenant", tenantId, "casos"] });
    notificar("Caso creado correctamente");
  },
  onError: () => notificar("No se pudo crear el caso. Inténtalo de nuevo."),
});
```

## Textos visibles (tono humano)

Los mensajes que lee un apoderado o inspector no deben oler a IA. Patrones de `blader/humanizer` adaptados al español (MIT, solo los aplicables; el original es anglocéntrico):

- Sin restos de chatbot: nada de "¡Espero que te sirva!" o "¡Excelente pregunta!".
- Sin complacencia excesiva: responde directo, sin adular.
- Sin finales genéricos ("¡El futuro se ve brillante!"): cierra con un hecho o una acción.
- Sin negritas en exceso ni listas con mini-títulos en negrita cuando la prosa basta.
- Sin emojis en textos institucionales (actas, informes, notificaciones).
- Sin tríadas forzadas: usa la cantidad de elementos que el sentido pida.
- Sin muletillas: "para" en vez de "con el fin de"; "porque" en vez de "debido al hecho de que".
- Un calificador por frase: "puede" en vez de "podría potencialmente quizás".
- Nombra al actor cuando ayude: "El inspector registró el caso" en vez de "El caso fue registrado".
- Describe el estado actual, no la historia: "El caso está en seguimiento" en vez de "Esta función fue agregada para reemplazar…".
- Neutro y factual, sin lenguaje de ventas ("vibrante", "testimonio", "inolvidable").
- Directo, sin "No es solo X, es Y".

```text
Mal:  "¡Excelente! 🎉 El caso fue creado exitosamente. ¡El futuro de la convivencia se ve brillante!"
Bien: "Caso creado. Quedó en seguimiento con el inspector de nivel."
```

## Checklist antes de entregar

- [ ] Tipos TypeScript estrictos (sin `any` innecesario).
- [ ] Textos visibles en español.
- [ ] `npm run lint` y `tsc --noEmit` pasan.
