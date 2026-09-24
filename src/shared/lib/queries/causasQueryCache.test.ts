/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { queryClient } from "../../../lib/queryClient";
import { EstadoCausa, type Causa } from "../../../shared/lib/types";
import {
  mergeCausasList,
  mergeChecklistItems,
  syncPersistedCausasToCache,
} from "./causasQueryCache";
import { getInvestigationClosureDate } from "../legalCompliance/deadlineValidators";
import { causasQueryKeys } from "./causasQueryKeys";

function createCausa(overrides: Partial<Causa> = {}): Causa {
  return {
    id: "DC-2026-001",
    estudianteNombre: "N. N.",
    estudianteCurso: "7° Básico A",
    nnaProtectedName: "N. N.",
    runEstudiante: "",
    fechaApertura: "2026-07-30",
    estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
    tipoInfraccion: "Grave",
    responsable: "Encargado",
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: "2026-07-30T12:00:00.000Z",
    observaciones: "",
    bitacora: [],
    checklistDebidoProceso: [],
    ...overrides,
  };
}

describe("causasQueryCache", () => {
  it("separa la caché de causas por tenant y por detalle", () => {
    assert.deepEqual(causasQueryKeys.list("tenant-a"), [
      "causas",
      "tenant-a",
      "list",
      "cursor",
    ]);
    assert.deepEqual(causasQueryKeys.details("tenant-a", "DC-2026-001"), [
      "causas",
      "tenant-a",
      "details",
      "DC-2026-001",
    ]);
  });

  it("conserva los antecedentes ya cargados al refrescar sólo el listado", () => {
    const hydrated = createCausa({
      bitacora: [
        {
          id: "historial-1",
          fecha: "2026-07-30T12:00:00.000Z",
          tipo: "Otro",
          titulo: "Antecedente",
          descripcion: "Descripción",
          participantes: [],
        },
      ],
    });
    const freshList = [createCausa({ responsable: "Nueva responsable" })];

    const merged = mergeCausasList([hydrated], freshList);

    assert.equal(merged[0].responsable, "Nueva responsable");
    assert.equal(merged[0].bitacora.length, 1);
    assert.equal(merged[0].bitacora[0].id, "historial-1");
  });

  it("refleja en la tabla hitos completados fuera del modal sin perder metadatos", () => {
    const loaded = createCausa({
      checklistDebidoProceso: [
        {
          id: "chk_res_2",
          label: "Informe Cierre de Indagación Emitido",
          descripcion: "Emitir informe de cierre",
          completado: false,
          requeridoPor: "Circular 482",
        },
      ],
    });
    const freshList = [
      createCausa({
        checklistDebidoProceso: [
          {
            id: "chk_res_2",
            label: "",
            descripcion: "",
            completado: true,
            fechaCompletado: "2026-09-20",
            requeridoPor: "Circular 482",
          },
        ],
      }),
    ];

    const merged = mergeCausasList([loaded], freshList);
    const item = merged[0].checklistDebidoProceso[0];

    assert.equal(item.completado, true);
    assert.equal(item.fechaCompletado, "2026-09-20");
    assert.equal(item.label, "Informe Cierre de Indagación Emitido");
    assert.equal(getInvestigationClosureDate(merged[0]), "2026-09-20");
  });

  it("conserva ticks optimistas locales ante un refetch del listado", () => {
    const current = [
      {
        id: "chk_res_2",
        label: "Informe Cierre de Indagación Emitido",
        descripcion: "",
        completado: true,
        fechaCompletado: "2026-09-20",
        requeridoPor: "Circular 482" as const,
      },
    ];
    const fresh = [
      {
        id: "chk_res_2",
        label: "",
        descripcion: "",
        completado: false,
        requeridoPor: "Circular 482" as const,
      },
    ];

    const merged = mergeChecklistItems(current, fresh);

    assert.equal(merged[0].completado, true);
    assert.equal(merged[0].fechaCompletado, "2026-09-20");
  });

  it("mantiene los detalles cuando el listado llega sin resumen de hitos", () => {
    const current = [
      {
        id: "chk_res_2",
        label: "Informe Cierre de Indagación Emitido",
        descripcion: "",
        completado: true,
        fechaCompletado: "2026-09-20",
        requeridoPor: "Circular 482" as const,
      },
    ];

    assert.deepEqual(mergeChecklistItems(current, []), current);
  });

  it("conserva los metadatos del detalle al sincronizar un autoguardado", () => {
    const tenantId = "tenant-cache-test";
    const causa = createCausa({
      estadoActual: EstadoCausa.RESOLUCION_ELABORACION,
      bitacora: [
        {
          id: "historial-1",
          fecha: "2026-07-30T12:00:00.000Z",
          tipo: "Otro",
          titulo: "Antecedente",
          descripcion: "Descripción",
          participantes: [],
        },
      ],
    });
    const key = causasQueryKeys.details(tenantId, causa.id);
    queryClient.setQueryData(key, causa);

    syncPersistedCausasToCache(tenantId, [causa]);

    const cached = queryClient.getQueryData<Causa>(key);
    assert.equal(cached?.estadoActual, EstadoCausa.RESOLUCION_ELABORACION);
    assert.equal(cached?.estudianteNombre, causa.estudianteNombre);
    assert.equal(cached?.bitacora[0]?.id, "historial-1");
    queryClient.removeQueries({ queryKey: key, exact: true });
  });
});
