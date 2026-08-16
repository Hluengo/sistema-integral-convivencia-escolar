---
name: prompt-engineering
description: Diseña prompts efectivos para IA, sistema de prompts, chain of thought. Trigger: prompt, IA, GPT, Claude, ingeniería de prompts.
---

# Prompt Engineering

Guía para diseñar prompts efectivos.

## Principios

### 1. Claridad
- Ser específico con el objetivo
- Incluir contexto relevante
- Definir formato de salida esperado

### 2. Estructura
```
[Rol] [Contexto] [Tarea] [Formato] [Restricciones]
```

### 3. Ejemplo
```
Actúa como un abogado educativo chileno.
Tengo un caso de convivencia escolar con estos antecedentes: [...]
Redacta un informe técnico que incluya: [...]
Formato: documento formal con secciones numeradas.
Restricciones: lenguaje jurídico, sin juicios de valor.
```

## Patrones

### Zero-shot
```
Clasifica el siguiente texto como: positivo, negativo o neutro.
Texto: [...]
```

### Few-shot
```
Clasifica textos de sentimiento.

Ejemplo 1:
Texto: "Me encanta este producto"
Sentimiento: positivo

Ejemplo 2:
Texto: "Es terrible el servicio"
Sentimiento: negativo

Ahora clasifica:
Texto: [...]
```

### Chain of Thought
```
Analiza paso a paso:
1. Primero identifica los hechos
2. Luego la normativa aplicable
3. Después la solución propuesta
4. Finalmente los riesgos
```

### System Prompt
```
Eres un experto en [dominio]. Tu tarea es [objetivo].
Reglas:
- [regla 1]
- [regla 2]
Formato de respuesta: [formato]
```

## Errores Comunes
- Prompts demasiado vagos
- Sin contexto suficiente
- Sin formato de salida
- Demasiadas instrucciones mezcladas
- Sin ejemplos cuando se necesitan

## Comandos Relacionados
- `@prompt-engineering` para diseño de prompts
- `@documentation` para documentar prompts
