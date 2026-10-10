import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractAnnotationCategory,
  extractAnnotationTeacher,
  formatAnnotationDisplayText,
  resolveAnnotationRegistrar,
} from "./annotationDisplay";

describe("formatAnnotationDisplayText", () => {
  it("extrae la anotación legible desde el texto repetido del PDF", () => {
    assert.equal(
      formatAnnotationDisplayText(
        "10/07/2026 Tipo: Negativa Anotación: ESTUDIANTE EMITE COMENTARIOS DESUBICADOS. Profesor: VANNIA",
      ),
      "ESTUDIANTE EMITE COMENTARIOS DESUBICADOS.",
    );
  });

  it("conserva y normaliza una anotación manual", () => {
    assert.equal(
      formatAnnotationDisplayText("  Llega tarde\n a clases.  "),
      "Llega tarde a clases.",
    );
  });

  it("oculta el prefijo de categoría del lote masivo", () => {
    assert.equal(
      formatAnnotationDisplayText(
        "[COMPORTAMIENTO] UTILIZA CELULAR DURANTE LA CLASE.",
      ),
      "UTILIZA CELULAR DURANTE LA CLASE.",
    );
  });

  it("limpia restos de sintaxis del lote antes del prefijo", () => {
    assert.equal(
      formatAnnotationDisplayText(
        "[RESPONSABILIDAD] Anotación: SE AGRADECE PARTICIPACIÓN EN EUCARISTÍA.",
      ),
      "SE AGRADECE PARTICIPACIÓN EN EUCARISTÍA.",
    );
  });

  it("no repite metadatos cuando el bloque no trae descripción", () => {
    assert.equal(
      formatAnnotationDisplayText(
        "11/08/2026 Tipo: Negativa Profesor: VANNIA ANDREA RETAMAL SALGADO",
      ),
      "Sin descripción registrada en el PDF.",
    );
  });

  it("no muestra la categoría como descripción cuando no hay registro", () => {
    assert.equal(
      formatAnnotationDisplayText(
        "[RESPONSABILIDAD] Categoria: RESPONSABILIDAD",
      ),
      "Sin descripción registrada en el PDF.",
    );
  });
});

describe("extractAnnotationCategory", () => {
  it("lee el prefijo del lote masivo", () => {
    assert.equal(
      extractAnnotationCategory("[COMPORTAMIENTO] UTILIZA CELULAR."),
      "COMPORTAMIENTO",
    );
  });

  it("lee la categoría del bloque individual", () => {
    assert.equal(
      extractAnnotationCategory(
        "08/04/2026 Tipo: Negativa Categoria: COMPORTAMIENTO Anotación: ALUMNO GRITA. Profesor: X",
      ),
      "COMPORTAMIENTO",
    );
  });

  it("normaliza el acento de información", () => {
    assert.equal(
      extractAnnotationCategory("[INFORMACIÒN] AUSENTE A EVALUACIÓN."),
      "INFORMACIÓN",
    );
  });

  it("retorna null sin categoría", () => {
    assert.equal(extractAnnotationCategory("Llega tarde a clases."), null);
  });
});

describe("extractAnnotationTeacher", () => {
  it("extrae el docente al final del bloque", () => {
    assert.equal(
      extractAnnotationTeacher(
        "18/03/2026 Tipo: Negativa Anotación: ALUMNO USA CELULAR. Profesor: MARIA ANDREA ABDALA JURE",
      ),
      "MARIA ANDREA ABDALA JURE",
    );
  });

  it("recorta arrastre de campos", () => {
    assert.equal(
      extractAnnotationTeacher(
        "10/07/2026 Tipo: Negativa Anotación: GRITA. Profesor: MARITZA PALMA Anotación: AUSENTE.",
      ),
      "MARITZA PALMA",
    );
  });

  it("retorna null sin profesor", () => {
    assert.equal(extractAnnotationTeacher("Llega tarde a clases."), null);
  });
});

describe("acentos descompuestos del PDF", () => {
  it("extrae al docente aunque la etiqueta use acento descompuesto", () => {
    assert.equal(
      extractAnnotationTeacher(
        "13-08-2026 Tipo: Negativa Anotación: ALUMNA QUE LLEGA TARDE .- Profesor: ESTER NOEMI CONTRERAS ESPINOZA Anotación: ALUMNA QUE LLEGA TARDE .-",
      ),
      "ESTER NOEMI CONTRERAS ESPINOZA",
    );
  });

  it("muestra el texto limpio aunque las etiquetas usen acento descompuesto", () => {
    assert.equal(
      formatAnnotationDisplayText(
        "13-08-2026 Tipo: Negativa Anotación: ALUMNA QUE LLEGA TARDE .- Profesor: ESTER NOEMI CONTRERAS ESPINOZA",
      ),
      "ALUMNA QUE LLEGA TARDE .-",
    );
  });
});

describe("resolveAnnotationRegistrar", () => {
  it("conserva el responsable guardado cuando no es genérico", () => {
    assert.equal(
      resolveAnnotationRegistrar(
        "MARITZA FERNANDA CARRASCO PALMA",
        "[COMPORTAMIENTO] GRITA.",
      ),
      "MARITZA FERNANDA CARRASCO PALMA",
    );
  });

  it("resuelve el docente desde el texto cuando es genérico", () => {
    assert.equal(
      resolveAnnotationRegistrar(
        "PDF Convivencia Escolar",
        "18/03/2026 Tipo: Negativa Anotación: ALUMNO USA CELULAR. Profesor: MARIA ANDREA ABDALA JURE",
      ),
      "MARIA ANDREA ABDALA JURE",
    );
  });

  it("mantiene el genérico si no hay docente en el texto", () => {
    assert.equal(
      resolveAnnotationRegistrar("PDF Convivencia Escolar", "Llega tarde."),
      "PDF Convivencia Escolar",
    );
  });

  it("recorta etiquetas arrastradas en un responsable ya guardado", () => {
    assert.equal(
      resolveAnnotationRegistrar(
        "ESTER NOEMI CONTRERAS ESPINOZA Anotación: Anotación: ALUMNA QUE LLEGA TARDE .-",
        "",
      ),
      "ESTER NOEMI CONTRERAS ESPINOZA",
    );
  });
});
