/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Causa } from "@/shared/lib/types";
import {
  fetchHechoEvidencias,
  fetchHechos,
} from "@/shared/api/services/hechos.service";
import { useAuthStore } from "@/shared/lib/stores/authStore";
import { getSemaforoPlazos, type Semaforo } from "@/shared/lib/semaforo";
import AuditoriaPanel from "./AuditoriaPanel";

const dotTone: Record<Semaforo, string> = {
  verde: "bg-green-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-500",
  gris: "bg-slate-300",
};

/**
 * Estado jurídico-procedimental del caso: semáforo de plazos + auditoría de
 * garantías con datos reales. Reutiliza la caché de Matriz (mismas queryKeys).
 */
export default function EstadoProcedimental({ causa }: { causa: Causa }) {
  const tenantId = useAuthStore((s) => s.tenantId);

  const hechosQuery = useQuery({
    queryKey: ["hechos", causa.id, tenantId],
    queryFn: () => fetchHechos(causa.id),
    enabled: Boolean(causa.id),
  });
  const evidenciasQuery = useQuery({
    queryKey: ["hecho_evidencias", causa.id, tenantId],
    queryFn: () => fetchHechoEvidencias(causa.id),
    enabled: Boolean(causa.id),
  });

  const hechos = hechosQuery.data ?? [];
  const vinculos = evidenciasQuery.data ?? [];
  const plazos = useMemo(() => getSemaforoPlazos(causa), [causa]);

  return (
    <div className="space-y-3">
      <section
        aria-label="Semáforo de plazos"
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {plazos.map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-2"
              title={p.detalle}
            >
              <span
                className={`mt-1 size-2.5 shrink-0 rounded-full ${dotTone[p.semaforo]}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="font-semibold text-xs text-slate-700">
                  {p.label}
                </p>
                <p className="truncate text-11px text-slate-500">{p.detalle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AuditoriaPanel causa={causa} hechos={hechos} vinculos={vinculos} />
    </div>
  );
}
