# Regla: IA y LLM

## Uso
Aplicar a código que interactúe con APIs de IA (Groq, Gemini, etc.).

## Reglas
1. SIEMPRE sanitizar inputs antes de enviar a IA
2. NUNCA enviar datos sensibles (RUTs, nombres) a IA
3. SIEMPRE usar herramientas (`tools`) para ejecutar acciones
4. NUNCA confiar ciegamente en respuestas de IA
5. SIEMPRE validar outputs de IA antes de usar
6. NO almacenar prompts completos con datos sensibles
7. SIEMPRE usar el modelo apropiado según la tarea (ver `ai-model-selector.ts`)

## Herramientas Disponibles
- `actualizar_causa`: Actualizar campos de una causa
- `agregar_nota_bitacora`: Agregar entrada a bitácora
- `marcar_checklist`: Marcar/desmarcar item de checklist
- `descargar_documento`: Obtener URL firmada de documento
- `adjuntar_documento`: Subir documento a una causa
