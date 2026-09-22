/** @license SPDX-License-Identifier: Apache-2.0 */

import { Download } from "lucide-react";
import type { Causa } from "../../../shared/lib/types";
import ExpedienteExportPanel from "./ExpedienteExportPanel";
import EstadoProcedimental from "../matriz/EstadoProcedimental";
import MatrizPanel from "../matriz/MatrizPanel";

export default function CausaExpedienteTab({ causa }: { causa: Causa }) {
  return (
    <section aria-labelledby="expediente-title" className="space-y-6">
      <header className="flex items-start gap-2.5 rounded-lg border border-neutral-150 bg-white p-4 shadow-xs">
        <span
          className="rounded-lg bg-brand-100 p-1.5 text-brand-700"
          aria-hidden="true"
        >
          <Download className="size-4" />
        </span>
        <div>
          <h2
            id="expediente-title"
            className="font-semibold text-neutral-900 text-sm"
          >
            Expediente
          </h2>
          <p className="mt-0.5 text-neutral-600 text-xs">
            Construye la prueba, verifica garantías y descarga el paquete de
            cierre.
          </p>
        </div>
      </header>

      <section aria-labelledby="expediente-prueba-title" className="space-y-3">
        <h3
          id="expediente-prueba-title"
          className="font-semibold text-neutral-900 text-sm"
        >
          1. Prueba hecho-evidencia-RICE
        </h3>
        <MatrizPanel causa={causa} />
      </section>

      <section aria-labelledby="expediente-estado-title" className="space-y-3">
        <h3
          id="expediente-estado-title"
          className="font-semibold text-neutral-900 text-sm"
        >
          2. Estado y auditoría
        </h3>
        <EstadoProcedimental causa={causa} />
      </section>

      <section
        aria-labelledby="expediente-descarga-title"
        className="space-y-3"
      >
        <h3
          id="expediente-descarga-title"
          className="font-semibold text-neutral-900 text-sm"
        >
          3. Descarga del paquete
        </h3>
        <div className="rounded-lg border border-neutral-150 bg-white p-4 shadow-xs">
          <ExpedienteExportPanel causa={causa} />
        </div>
      </section>
    </section>
  );
}
