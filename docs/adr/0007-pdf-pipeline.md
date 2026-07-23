# ADR-0007: PDF Pipeline — pdfjs-dist + Regex (No AI)

## Context
Necesitábamos extraer anotaciones disciplinarias de PDFs de inspectoría. Dos opciones: usar AI (costo por llamada) o parsing determinista (regex).

## Decisión
Usar pdfjs-dist para extracción de texto + regex puro para parsing. Sin AI en el pipeline de PDF.

## Alternativas Consideradas
- **OpenRouter/GPT-4 Vision**: +$0.01 por página, más lento, output no determinista
- **Tesseract OCR**: Heavy, requiere WASM, no necesario (PDFs son digitales, no escaneados)
- **pdf-parse**: Biblioteca más simple, pero menos control sobre el worker
- **AI + regex híbrido**: Lo peor de ambos mundos (costo + complejidad)

## Consecuencias
- **Positivas**: Costo cero por análisis de PDF
- **Positivas**: Output determinista (22 tests, 0 falsos positivos)
- **Positivas**: Sin latencia de API, procesamiento local
- **Positivas**: Fácil de debuggear (regex visible, testeable)
- **Negativas**: No funciona con PDFs escaneados (requieren OCR)
- **Negativas**: Regex frágil ante cambios de formato en los PDFs
- **Negativas**: Requiere polyfills Node (DOMMatrix, ImageData, Path2D)
- **Mitigación**: Student matching con múltiples estrategias (exacto, NFD, overlap, curso)
