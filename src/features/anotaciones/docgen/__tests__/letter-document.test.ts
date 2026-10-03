/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it } from "node:test";
import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Annotation } from "../../../../shared/lib/types";
import {
  buildLetterAnnotationSummary,
  DEFAULT_LETTER_CONTENT,
  isLetterAnnotationSummary,
} from "../DocumentPreview/docTypes";
import { splitAgreements } from "../DocumentPreview/SharedComponents";
import {
  getCartaProcessingBlockReason,
  getEffectiveDisciplinaryStage,
  getHighestPriorityLetterType,
  getNextLetterAfterPhysicalCarta,
  getOutstandingLetterType,
  getPhysicalCartaBaselineType,
  getStudentCartaWorkflowLabel,
  resolveStudentCartaTableState,
} from "../../../../shared/lib/domain/disciplinaryStage";

const srcDir = resolve(import.meta.dirname!, "../../../../..");

describe("Resumen de anotaciones de cartas", () => {
  const annotations: Annotation[] = [
    {
      id: "neg-1",
      text: "Falta negativa",
      date: "2026-08-01",
      registered_by: "Inspectoría",
      type: "Negativa",
      student_id: "student-1",
      severity: "Grave",
    },
    {
      id: "neg-2",
      text: "Otra falta negativa",
      date: "2026-08-02",
      registered_by: "Inspectoría",
      type: "Negativa",
      student_id: "student-1",
      severity: "Grave",
    },
    {
      id: "pos-1",
      text: "Reconocimiento positivo",
      date: "2026-08-03",
      registered_by: "Profesorado",
      type: "Positiva",
      student_id: "student-1",
      severity: "Leve",
    },
    {
      id: "info-1",
      text: "Registro informativo",
      date: "2026-08-04",
      registered_by: "Inspectoría",
      type: "Información",
      student_id: "student-1",
      severity: "Leve",
    },
  ];

  it("mantiene solo las negativas seleccionadas y agrega positivas e informativas", () => {
    const summary = buildLetterAnnotationSummary(annotations, [annotations[1]]);

    deepEqual(
      summary.negativas.map((item) => item.id),
      ["neg-2"],
    );
    deepEqual(
      summary.positivas.map((item) => item.id),
      ["pos-1"],
    );
    deepEqual(
      summary.informativas.map((item) => item.id),
      ["info-1"],
    );
  });

  it("valida snapshots completos para conservar el contenido emitido", () => {
    ok(
      isLetterAnnotationSummary({
        negativas: [],
        positivas: [],
        informativas: [],
      }),
    );
    ok(!isLetterAnnotationSummary({ negativas: [], positivas: [] }));
  });
});

describe("letter-document — Formato Carta (216x279mm)", () => {
  const cssPath = resolve(import.meta.dirname!, "../letter-document.css");
  let css: string;

  it("debe cargar el CSS", () => {
    css = readFileSync(cssPath, "utf-8");
    ok(css.length > 0, "el archivo CSS existe y no esta vacio");
  });

  it("debe definir dimensiones 216mm x 279mm", () => {
    ok(css.includes("width: 216mm"), "width debe ser 216mm");
    ok(css.includes("height: 279mm"), "height debe ser 279mm");
    ok(css.includes("min-width: 216mm"), "min-width debe ser 216mm");
    ok(css.includes("min-height: 279mm"), "min-height debe ser 279mm");
  });

  it("debe usar padding uniforme de 12mm", () => {
    ok(css.includes("padding: 12mm"), "padding debe ser 12mm");
    ok(
      css.includes("padding: 12mm;"),
      "padding en .letter-document debe ser 12mm",
    );
  });

  it("debe definir @page size 216mm 279mm", () => {
    ok(css.includes("216mm 279mm"), "@page debe especificar 216mm 279mm");
    ok(css.includes("@page"), "@page rule debe existir");
  });

  it("NO debe referenciar dimensiones antiguas de Oficio (330mm)", () => {
    ok(!css.includes("330mm"), "NO debe contener 330mm (Oficio)");
    ok(
      !css.includes("20mm 25mm"),
      "NO debe contener margenes antiguos 20mm 25mm",
    );
  });

  it("print media query debe usar dimensiones Carta", () => {
    ok(css.includes("height: 279mm"), "@media print debe usar 279mm");
  });
});

describe("Servicios eliminados — sin dependencias obsoletas", () => {
  function checkNoImports(pkg: string): void {
    const files = findImportRefs(pkg);
    equal(files.length, 0, `${pkg} aun se importa en: ${files.join(", ")}`);
  }

  it("pdf-lib NO debe importarse en el proyecto", () =>
    checkNoImports("pdf-lib"));
  it("html-to-image NO debe importarse en el proyecto", () =>
    checkNoImports("html-to-image"));
  it("file-saver NO debe importarse en el proyecto", () =>
    checkNoImports("file-saver"));
  it("docx NO debe importarse en el proyecto", () => checkNoImports("docx"));
});

describe("DocumentPreview — acciones del trámite", () => {
  const previewPath = resolve(import.meta.dirname!, "../DocumentPreview.tsx");
  let content: string;

  it("debe cargar el componente", () => {
    content = readFileSync(previewPath, "utf-8");
    ok(content.length > 0, "el archivo existe y no esta vacio");
  });

  it("debe tener boton Imprimir", () => {
    ok(content.includes("Imprimir"), "debe contener el texto Imprimir");
  });

  it("debe mostrar Marcar como procesada junto a Imprimir", () => {
    ok(
      content.includes("Marcar como procesada"),
      "debe permitir confirmar el trámite",
    );
    ok(
      content.indexOf("Imprimir") < content.indexOf("Marcar como procesada"),
      "Marcar como procesada debe aparecer después de Imprimir",
    );
  });

  it("NO debe tener referencias a PDF", () => {
    ok(!content.includes("onExportPDF"), "no debe tener onExportPDF");
    ok(!content.includes("Descargar PDF"), "no debe tener Descargar PDF");
    ok(!content.includes("FileDown"), "no debe importar FileDown icon");
  });

  it("NO debe tener referencias a Word", () => {
    ok(!content.includes("onExportWord"), "no debe tener onExportWord");
    ok(!content.includes("Descargar Word"), "no debe tener Descargar Word");
  });

  it("NO debe tener prop isExportingPdf", () => {
    ok(!content.includes("isExportingPdf"), "no debe tener isExportingPdf");
  });

  it("NO debe tener prop docObservations", () => {
    ok(!content.includes("docObservations"), "no debe tener docObservations");
  });
});

describe("LetterA4Document — sin docObservations", () => {
  const docPath = resolve(import.meta.dirname!, "../LetterA4Document.tsx");
  let content: string;

  it("debe cargar el componente", () => {
    content = readFileSync(docPath, "utf-8");
    ok(content.length > 0, "el archivo existe y no esta vacio");
  });

  it("NO debe tener prop docObservations en sharedProps", () => {
    ok(
      !content.includes("docObservations"),
      "LetterA4Document no debe tener docObservations",
    );
  });
});

describe("PrintHintDialog — texto Carta", () => {
  const dialogPath = resolve(
    import.meta.dirname!,
    "../components/PrintHintDialog.tsx",
  );
  let content: string;

  it("debe cargar el componente", () => {
    content = readFileSync(dialogPath, "utf-8");
    ok(content.length > 0, "el archivo existe y no esta vacio");
  });

  it("debe mencionar Carta 216x279mm", () => {
    ok(
      content.includes("Carta (216 x 279 mm)"),
      "debe especificar Carta 216x279mm",
    );
  });

  it("NO debe mencionar Oficio", () => {
    ok(!content.includes("Oficio"), "NO debe mencionar Oficio");
  });

  it("debe indicar que el trámite se confirma manualmente", () => {
    ok(
      content.includes("Marcar como procesada"),
      "debe instruir al usuario a confirmar el trámite después de imprimir",
    );
  });
});

describe("Generador de cartas — sin registro y emisión duplicados", () => {
  const generatorPath = resolve(
    import.meta.dirname!,
    "../../AnotacionesDocumentGenerator.tsx",
  );
  const formPath = resolve(import.meta.dirname!, "../DocumentForm.tsx");
  let generator: string;
  let form: string;

  it("debe cargar los componentes", () => {
    generator = readFileSync(generatorPath, "utf-8");
    form = readFileSync(formPath, "utf-8");
    ok(generator.length > 0);
    ok(form.length > 0);
  });

  it("NO debe ofrecer Registrar y Emitir Carta", () => {
    ok(!form.includes("Registrar y Emitir Carta"));
    ok(!form.includes("onRegisterCommitment"));
  });

  it("NO debe conservar el flujo automático de emisión", () => {
    ok(!generator.includes("EmissionConfirmDialog"));
    ok(!generator.includes("useRegisterCommitment"));
    ok(!generator.includes("onRegistered"));
    ok(!generator.includes("onLetterAction"));
  });
});

describe("Cierre de cartas — validación de etapa registrada", () => {
  const generatorPath = resolve(
    import.meta.dirname!,
    "../../AnotacionesDocumentGenerator.tsx",
  );
  const cartasTabPath = resolve(
    import.meta.dirname!,
    "../../AnotacionesStudentDetailModal/CartasTab.tsx",
  );
  const tablePath = resolve(
    import.meta.dirname!,
    "../../AnotacionesStudentTable.tsx",
  );

  it("bloquea una derivación cuando Supabase registra menos de 15 negativas", () => {
    equal(
      getCartaProcessingBlockReason("derivacion", "compromiso_conductual", 14),
      "derivacion_requires_15_registered",
    );
  });

  it("permite procesar la derivación desde 15 negativas registradas", () => {
    equal(getCartaProcessingBlockReason("derivacion", "derivacion", 15), null);
  });

  it("no adelanta la derivación por existir un Compromiso físico", () => {
    equal(
      getCartaProcessingBlockReason("derivacion", "derivacion", 8),
      "derivacion_requires_15_registered",
    );
  });

  it("bloquea un tipo de documento distinto a la etapa registrada", () => {
    equal(
      getCartaProcessingBlockReason(
        "amonestacion",
        "compromiso_conductual",
        12,
      ),
      "letter_type_mismatch",
    );
  });

  it("envía el tipo seleccionado al confirmar y aclara el propósito de la observación", () => {
    const generator = readFileSync(generatorPath, "utf-8");
    const cartasTab = readFileSync(cartasTabPath, "utf-8");

    ok(generator.includes("onMarkProcessed(contentSnapshot, docType)"));
    ok(cartasTab.includes("selectedDocType"));
    ok(cartasTab.includes("ensureCarta(requestedDocType)"));
    ok(cartasTab.includes("selectedDocType,"));
    ok(cartasTab.includes("Este texto no cambia el tipo de carta."));
    ok(cartasTab.includes("Confirme primero la anotación número 15"));
  });

  it("reinicia el generador cuando cambia la etapa o la carta activa", () => {
    const cartasTab = readFileSync(cartasTabPath, "utf-8");

    ok(
      /key=\{`\$\{student\.id\}:\$\{activeDocType\}:\$\{activeCarta\?\.id \?\? ["']new["']\}`\}/.test(
        cartasTab,
      ),
    );
    ok(cartasTab.includes("processingFeedback="));
  });

  it("abrir el generador no registra una carta en el historial", () => {
    const cartasTab = readFileSync(cartasTabPath, "utf-8");
    const historyTab = readFileSync(
      resolve(
        import.meta.dirname!,
        "../../AnotacionesStudentDetailModal/HistoryTab.tsx",
      ),
      "utf-8",
    );

    ok(!cartasTab.includes("createCartaEvent("));
    ok(!cartasTab.includes("'created'"));
    ok(/event\.event_type !== ["']created["']/.test(historyTab));
    ok(/event\.event_type !== ["']suggested["']/.test(historyTab));
    ok(!historyTab.includes("Carta creada:"));
    ok(!historyTab.includes("Carta sugerida:"));
  });

  it("muestra el nombre del estado y no la clase CSS en la tabla", () => {
    const table = readFileSync(tablePath, "utf-8");

    ok(table.includes("{s}"));
    ok(table.includes("badge.textClass"));
    ok(table.includes("Archivada"));
    ok(!table.includes("{badge.text}"));
  });

  it("muestra acciones visibles para anular y archivar cartas", () => {
    const cartasTab = readFileSync(cartasTabPath, "utf-8");

    ok(cartasTab.includes("Anular"));
    ok(cartasTab.includes("Archivar"));
    ok(cartasTab.includes("Archivar carta"));
    ok(cartasTab.includes("bg-gravisima-50"));
    ok(cartasTab.includes("bg-leve-50"));
  });
});

describe("Constancias físicas — progresión anual", () => {
  const cartas = [
    {
      origin: "physical",
      school_year: 2026,
      emission_date: "2026-06-20",
      status: "Vigente",
      letter_type: "Amonestación Escrita",
    },
    {
      origin: "physical",
      school_year: 2025,
      emission_date: "2025-11-20",
      status: "Vigente",
      letter_type: "Carta de Compromiso Conductual",
    },
  ];

  it("usa solamente la constancia física del año consultado", () => {
    equal(getPhysicalCartaBaselineType(cartas, 2026), "Amonestación Escrita");
    equal(getPhysicalCartaBaselineType(cartas, 2027), null);
  });

  it("una Amonestación física habilita Compromiso", () => {
    equal(
      getNextLetterAfterPhysicalCarta("Amonestación Escrita"),
      "compromiso_conductual",
    );
  });

  it("un Compromiso físico habilita Derivación", () => {
    equal(
      getNextLetterAfterPhysicalCarta("Carta de Compromiso Conductual"),
      "derivacion",
    );
  });

  it("la progresión física prevalece sobre una sugerencia inferior por conteo", () => {
    equal(
      getHighestPriorityLetterType(
        "amonestacion",
        "derivacion",
        "compromiso_conductual",
      ),
      "derivacion",
    );
  });

  it("una constancia física coincidente deja la etapa procesada sin duplicarla", () => {
    equal(
      getOutstandingLetterType("Amonestación Escrita", "amonestacion"),
      null,
    );
    equal(
      getOutstandingLetterType(
        "Carta de Compromiso Conductual",
        "compromiso_conductual",
      ),
      null,
    );
  });

  it("solo sugiere una etapa superior cuando el conteo anual la exige", () => {
    equal(
      getOutstandingLetterType("Amonestación Escrita", "compromiso_conductual"),
      "compromiso_conductual",
    );
    equal(
      getOutstandingLetterType("Carta de Compromiso Conductual", "derivacion"),
      "derivacion",
    );
  });
});

describe("Estado efectivo de cartas en la tabla", () => {
  it("prioriza una carta física procesada que coincide con el conteo actual", () => {
    equal(
      getStudentCartaWorkflowLabel(5, {
        completedLetterType: "Amonestación Escrita",
        currentLetterType: "Carta de Compromiso Conductual",
        workflowStatus: "pending",
      }),
      "Procesada",
    );
  });

  it("mantiene pendiente la etapa superior cuando el conteo ya la exige", () => {
    equal(
      getStudentCartaWorkflowLabel(10, {
        completedLetterType: "Amonestación Escrita",
        currentLetterType: "Carta de Compromiso Conductual",
        workflowStatus: "pending",
      }),
      "Pendiente",
    );
  });

  it("muestra Derivación procesada aunque existan solo 14 negativas", () => {
    const cartaState = resolveStudentCartaTableState(
      [
        {
          letter_type: "Carta de Compromiso Conductual",
          emission_date: "2026-07-28",
          created_at: "2026-07-28T20:54:55.000Z",
          origin: "physical",
          school_year: 2026,
          status: "Vigente",
          workflow_status: "completed",
        },
        {
          letter_type: "Ficha de Derivación",
          emission_date: "2026-07-28",
          created_at: "2026-07-28T20:54:58.000Z",
          origin: "platform",
          school_year: 2026,
          status: "Vigente",
          workflow_status: "completed",
          processed_manually_at: "2026-07-28T20:59:32.000Z",
        },
      ],
      2026,
    );

    equal(cartaState.completedLetterType, "Ficha de Derivación");
    equal(cartaState.currentLetterType, "Ficha de Derivación");
    equal(cartaState.workflowStatus, "completed");
    equal(
      getEffectiveDisciplinaryStage(14, cartaState.completedLetterType).key,
      "derivacion",
    );
  });

  it("no deja que una carta de un año anterior altere la progresión vigente", () => {
    const cartaState = resolveStudentCartaTableState(
      [
        {
          letter_type: "Ficha de Derivación",
          emission_date: "2025-11-20",
          origin: "platform",
          school_year: 2025,
          status: "Vigente",
          workflow_status: "completed",
        },
      ],
      2026,
    );

    equal(cartaState.completedLetterType, null);
    equal(
      getEffectiveDisciplinaryStage(7, cartaState.completedLetterType).key,
      "amonestacion",
    );
  });

  it("mantiene pendiente una Derivación creada pero todavía no procesada", () => {
    const cartaState = resolveStudentCartaTableState(
      [
        {
          letter_type: "Ficha de Derivación",
          emission_date: "2026-07-28",
          origin: "platform",
          school_year: 2026,
          status: "Vigente",
          workflow_status: "pending",
        },
        {
          letter_type: "Carta de Compromiso Conductual",
          emission_date: "2026-07-20",
          origin: "physical",
          school_year: 2026,
          status: "Vigente",
          workflow_status: "completed",
        },
      ],
      2026,
    );

    equal(cartaState.currentLetterType, "Ficha de Derivación");
    equal(cartaState.workflowStatus, "pending");
    equal(cartaState.completedLetterType, "Carta de Compromiso Conductual");
  });

  it("muestra Archivada cuando la carta vigente ya fue firmada y archivada", () => {
    const cartaState = resolveStudentCartaTableState(
      [
        {
          letter_type: "Amonestación Escrita",
          emission_date: "2026-08-03",
          origin: "platform",
          school_year: 2026,
          status: "Vigente",
          workflow_status: "archived",
          processed_manually_at: "2026-08-03T14:00:00.000Z",
          archived_at: "2026-08-03T15:00:00.000Z",
        },
      ],
      2026,
    );

    equal(cartaState.workflowStatus, "archived");
    equal(getStudentCartaWorkflowLabel(5, cartaState), "Archivada");
  });

  it("mantiene Pendiente si existe una etapa superior aunque haya una carta inferior archivada", () => {
    const cartaState = resolveStudentCartaTableState(
      [
        {
          letter_type: "Amonestación Escrita",
          emission_date: "2026-07-20",
          origin: "platform",
          school_year: 2026,
          status: "Vigente",
          workflow_status: "archived",
          archived_at: "2026-07-21T15:00:00.000Z",
        },
        {
          letter_type: "Carta de Compromiso Conductual",
          emission_date: "2026-08-03",
          origin: "platform",
          school_year: 2026,
          status: "Vigente",
          workflow_status: "pending",
        },
      ],
      2026,
    );

    equal(cartaState.workflowStatus, "pending");
    equal(getStudentCartaWorkflowLabel(10, cartaState), "Pendiente");
  });
});

describe("Carta de derivación — texto institucional", () => {
  it("mantiene el contenido base actualizado", () => {
    const derivacion = DEFAULT_LETTER_CONTENT.derivacion;

    ok(derivacion.motivo.includes("instancia de intervención especializada"));
    ok(derivacion.motivo.includes("Art. 24 BIS"));
    ok(
      derivacion.descripcion.includes(
        "Amonestación Escrita y la Carta de Compromiso",
      ),
    );
    ok(derivacion.medida.includes("Equipo de Convivencia Escolar"));
    ok(derivacion.acuerdos.includes("seguimiento quincenal"));
    ok(
      derivacion.acuerdos.includes(
        "sin perjuicio de la participación del apoderado",
      ),
    );
    ok(derivacion.acuerdos.includes("debido proceso"));
    ok(derivacion.cierre.includes("artículos 12, 19, 20 (Paso 8) y 24 BIS"));
  });
});

describe("Carta de amonestación — texto institucional", () => {
  it("mantiene el contenido base actualizado", () => {
    const amonestacion = DEFAULT_LETTER_CONTENT.amonestacion;

    ok(
      amonestacion.motivo.includes(
        "primera acumulación de 5 o más anotaciones leves",
      ),
    );
    ok(amonestacion.motivo.includes("Art. 24 BIS"));
    ok(amonestacion.descripcion.includes("faltas leves (Art. 24)"));
    ok(amonestacion.medida.includes("Amonestación Escrita Formal"));
    ok(amonestacion.acuerdos.includes("nota de mérito"));
    ok(
      amonestacion.acuerdos.includes(
        "Medida 4 establecida en el Reglamento Interno",
      ),
    );
    ok(amonestacion.cierre.includes("artículos 18 (Medida 3) y 24 BIS"));
  });
});

describe("Carta de compromiso — texto institucional", () => {
  it("mantiene el contenido base actualizado", () => {
    const compromiso = DEFAULT_LETTER_CONTENT.compromiso_conductual;

    ok(compromiso.motivo.includes("10 o más anotaciones leves"));
    ok(compromiso.motivo.includes("segunda acumulación"));
    ok(compromiso.descripcion.includes("acompañamiento y compromiso"));
    ok(compromiso.medida.includes("Carta de Compromiso Conductual"));
    ok(compromiso.acuerdos.includes("(según conste en sus anotaciones)"));
    ok(!compromiso.acuerdos.includes("{PATRONES}"));
    ok(compromiso.acuerdos.includes("Inspectoría de su nivel"));
    ok(compromiso.acuerdos.includes("nota de mérito"));
    ok(compromiso.acuerdos.includes("debido proceso"));
    ok(compromiso.cierre.includes("artículos 18 (Medida 4) y 24 BIS"));
  });
});

describe("Acuerdos numerados — división robusta", () => {
  it("divide por saltos de línea reales", () => {
    deepEqual(splitAgreements("Primero.\nSegundo.\nTercero."), [
      "Primero.",
      "Segundo.",
      "Tercero.",
    ]);
  });

  it("reconoce secuencias literales de escape", () => {
    deepEqual(splitAgreements("Primero.\\nSegundo."), ["Primero.", "Segundo."]);
  });

  it("divide un bloque largo sin saltos por oraciones", () => {
    const block =
      "El estudiante se compromete a trabajar durante los próximos 30 días en la mejora de los patrones de conducta identificados en sus registros (según conste en sus anotaciones), procurando mantener relaciones respetuosas y acordes con las normas de convivencia. Deberá participar en instancias de seguimiento quincenal con Inspectoría de su nivel, dejando registro de los avances, dificultades y acuerdos adoptados. Durante este período se favorecerá la reflexión sobre las situaciones ocurridas y la búsqueda de estrategias que permitan prevenir su reiteración. Al finalizar los 30 días se realizará una evaluación del cumplimiento de los compromisos. En caso de observarse avances significativos, estos podrán ser reconocidos mediante una nota de mérito en su hoja de vida. Si las conductas persisten, se analizarán las medidas que correspondan de acuerdo con el Reglamento Interno, considerando los antecedentes del caso, las acciones desarrolladas y el debido proceso.";
    const items = splitAgreements(block);

    ok(items.length > 1);
    ok(items.every((item) => item.endsWith(".")));
  });

  it("no parte abreviaturas como Art. 23 en bloques largos", () => {
    const block = `${"x".repeat(380)} conforme al Art. 23. Deberá asistir a seguimiento.`;
    const items = splitAgreements(block);

    ok(items.some((item) => item.includes("Art. 23")));
  });

  it("conserva el bloque corto como párrafo único", () => {
    deepEqual(splitAgreements("Un solo acuerdo breve."), [
      "Un solo acuerdo breve.",
    ]);
  });
});

describe("Cartas en una hoja — anti-regresión", () => {
  it("define la variante de densidad para hoja Carta", () => {
    const css = readFileSync(
      resolve(import.meta.dirname!, "../letter-document.css"),
      "utf-8",
    );

    ok(css.includes(".letter-document--single"));
    ok(css.includes(".letter-agreements"));
  });

  it("aplica la variante de hoja única a las tres cartas", () => {
    const source = readFileSync(
      resolve(import.meta.dirname!, "../LetterA4Document.tsx"),
      "utf-8",
    );

    ok(source.includes("letter-document--single"));
  });

  it("mantiene los acuerdos del compromiso acotados a una hoja", () => {
    const compromiso = DEFAULT_LETTER_CONTENT.compromiso_conductual;

    ok(compromiso.acuerdos.length < 1400);
  });
});

function findImportRefs(pkg: string): string[] {
  const importPattern = new RegExp(
    String.raw`(?:from\s+|import\s*\(|require\s*\()\s*['"]${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`,
  );
  const references: string[] = [];

  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
        continue;
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) continue;
      if (importPattern.test(readFileSync(path, "utf-8")))
        references.push(path);
    }
  }

  for (const directory of ["src", "server", "api", "scripts", "tests"]) {
    visit(resolve(srcDir, directory));
  }

  return references;
}
