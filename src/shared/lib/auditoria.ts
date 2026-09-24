/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Causa, EstadoCausa } from "./types";
import type {
  HechoRow,
  HechoEvidenciaRow,
} from "../api/services/hechos.service";
import {
  canCloseCase,
  canCloseInvestigation,
  canNotifyDecision,
  type ProceduralContext,
} from "./domain/proceduralTransitions";

export type GarantiaEstado =
  "verificada" | "pendiente" | "no_aplica" | "bloqueante";

export interface GarantiaCheck {
  id: string;
  label: string;
  estado: GarantiaEstado;
  detalle: string;
  bloqueante: boolean;
}

export interface AuditoriaResult {
  checks: GarantiaCheck[];
  verificadas: number;
  total: number;
  bloqueantes: number;
  puedeCerrar: boolean;
  advertencias: string[];
}

function hasChecklist(
  causa: Causa,
  idPrefix: string,
  completado = true,
): boolean {
  return causa.checklistDebidoProceso.some(
    (c) => c.id.startsWith(idPrefix) && (completado ? c.completado : true),
  );
}

function hasBitacoraTipo(causa: Causa, tipo: string): boolean {
  return causa.bitacora.some((b) => b.tipo === (tipo as never));
}

function hasDescargos(causa: Causa): boolean {
  return causa.bitacora.some((b) => /descargo/i.test(b.titulo + b.descripcion));
}

function hasEntrevista(causa: Causa): boolean {
  return (
    hasBitacoraTipo(causa, "Entrevista") ||
    causa.bitacora.some((entry) => /entrevista/i.test(entry.titulo)) ||
    hasChecklist(causa, "chk_res_4") ||
    causa.checklistDebidoProceso.some(
      (item) => item.completado && /entrevista.*realizada/i.test(item.label),
    )
  );
}

export function auditarExpediente(
  causa: Causa,
  hechos: HechoRow[],
  vinculos: HechoEvidenciaRow[],
  persisted: Pick<ProceduralContext, "reconsideraciones" | "seguimientos"> = {},
): AuditoriaResult {
  const checks: GarantiaCheck[] = [];
  const proceduralContext: ProceduralContext = {
    hechos,
    vinculos,
    ...persisted,
  };
  const investigationTransition = canCloseInvestigation(
    causa,
    proceduralContext,
  );
  const decisionTransition = canNotifyDecision(causa);
  const closureTransition = canCloseCase(causa, proceduralContext);

  // 1. Comunicación de hechos: hecho registrado o recepción formal de denuncia.
  const recepcionDenuncia = hasChecklist(causa, "chk_rec_1");
  const c1 = hechos.length > 0 || recepcionDenuncia;
  checks.push({
    id: "comunicacion",
    label: "Comunicación de hechos",
    estado: c1 ? "verificada" : "bloqueante",
    detalle: c1
      ? hechos.length > 0
        ? `${hechos.length} hecho(s) registrado(s)`
        : "Recepción de denuncia registrada"
      : "Sin hechos ni recepción de denuncia",
    bloqueante: !c1,
  });

  // 2. Notificación a apoderado
  const c2 =
    hasBitacoraTipo(causa, "Notificación") || Boolean(causa.apoderadoEmail);
  checks.push({
    id: "notificacion_apoderado",
    label: "Notificación a apoderado",
    estado: c2 ? "verificada" : "pendiente",
    detalle: c2 ? "Notificación registrada" : "Sin notificación a apoderado",
    bloqueante: false,
  });

  // 3. Derecho a ser oído: entrevista o descargos del estudiante/apoderado
  // (Ley 21.809: ser oídos, presentar descargos y pedir reconsideración).
  const conEntrevista = hasEntrevista(causa);
  const conDescargos = hasDescargos(causa);
  const c3 = conEntrevista || conDescargos;
  checks.push({
    id: "ser_oido",
    label: "Derecho a ser oído",
    estado: c3 ? "verificada" : "pendiente",
    detalle: c3
      ? conEntrevista && conDescargos
        ? "Entrevista y descargos registrados"
        : conEntrevista
          ? "Entrevista registrada"
          : "Descargos registrados"
      : "Sin entrevista ni descargos",
    bloqueante: false,
  });

  // 4. Descargos recibidos — bitácora Otro con descargo o evidencia
  const c4 = conDescargos;
  checks.push({
    id: "descargos",
    label: "Descargos recibidos",
    estado: c4 ? "verificada" : "pendiente",
    detalle: c4 ? "Descargos en bitácora" : "Sin descargos registrados",
    bloqueante: false,
  });

  // 5. Evidencias incorporadas
  const evidenciasCount =
    vinculos.length || causa.bitacora.filter((b) => b.documentoAdjunto).length;
  const c5 = evidenciasCount > 0;
  checks.push({
    id: "evidencias",
    label: "Evidencias incorporadas",
    estado: c5 ? "verificada" : "bloqueante",
    detalle: c5 ? `${evidenciasCount} evidencia(s)` : "Sin evidencias",
    bloqueante: !c5 && hechos.some((h) => h.estado === "acreditado"),
  });

  // 6. Análisis de hechos acreditados
  const acreditados = hechos.filter((h) => h.estado === "acreditado");
  const c6 = acreditados.length > 0 || hechos.length === 0;
  // si hay hechos pero ninguno acreditado y ya se investiga, sigue pendiente
  const estadoAcreditadoPendiente =
    hechos.length > 0 && acreditados.length === 0;
  checks.push({
    id: "analisis_hechos",
    label: "Análisis de hechos acreditados",
    estado: estadoAcreditadoPendiente
      ? "pendiente"
      : c6
        ? "verificada"
        : "pendiente",
    detalle:
      acreditados.length > 0
        ? `${acreditados.length} acreditado(s)`
        : "Sin hechos acreditados",
    bloqueante: estadoAcreditadoPendiente,
  });

  // 7. Aplicación del RICE
  const conRice = acreditados.filter((h) => Boolean(h.rice_articulo));
  const c7ok =
    acreditados.length === 0 ? true : conRice.length === acreditados.length;
  checks.push({
    id: "rice",
    label: "Aplicación del RICE",
    estado: c7ok ? "verificada" : "bloqueante",
    detalle: c7ok
      ? "RICE en todos los acreditados"
      : `${acreditados.length - conRice.length} sin artículo RICE`,
    bloqueante: !c7ok,
  });

  // 8. Proporcionalidad
  const conProporcionalidad = acreditados.filter(
    (h) => (h.agravantes?.length ?? 0) > 0 || (h.atenuantes?.length ?? 0) > 0,
  );
  const c8ok =
    acreditados.length === 0
      ? true
      : conProporcionalidad.length === acreditados.length;
  checks.push({
    id: "proporcionalidad",
    label: "Proporcionalidad",
    estado: c8ok ? "verificada" : "pendiente",
    detalle: c8ok
      ? "Agravantes/atenuantes registrados"
      : "Falta análisis de proporcionalidad",
    bloqueante: false,
  });

  // 9. Decisión fundada por hecho — medida + fundamento en acreditados
  const conDecision = acreditados.filter(
    (h) =>
      h.participacion_acreditada &&
      Boolean(h.medida_seleccionada?.trim()) &&
      Boolean(h.decision_fundada.trim()),
  );
  const conDecisionOk =
    acreditados.filter((h) => h.participacion_acreditada).length === 0
      ? true
      : conDecision.length ===
        acreditados.filter((h) => h.participacion_acreditada).length;
  checks.push({
    id: "decision_fundada",
    label: "Decisión fundada por hecho",
    estado: conDecisionOk ? "verificada" : "pendiente",
    detalle: conDecisionOk
      ? "Medida y fundamento registrados"
      : "Falta medida o fundamento en hechos con participación",
    bloqueante: false,
  });

  // 10. Resolución fundada — checklist Resolución completado
  const c9 =
    hasChecklist(causa, "chk_res_") ||
    causa.estadoActual === ("Resolución Ejecutoriada" as EstadoCausa);
  // más preciso: al menos un chk_res completado
  checks.push({
    id: "resolucion",
    label: "Resolución fundada",
    estado: c9 ? "verificada" : "pendiente",
    detalle: c9 ? "Hito de resolución registrado" : "Sin resolución",
    bloqueante: false,
  });

  // 11. Notificación de decisión
  const c10 =
    hasChecklist(causa, "chk_res_") && hasBitacoraTipo(causa, "Resolución");
  checks.push({
    id: "notificacion_decision",
    label: "Notificación de decisión",
    estado: c10 ? "verificada" : "pendiente",
    detalle: c10 ? "Notificada" : "Pendiente",
    bloqueante: false,
  });

  // 12. Reconsideración/apelación
  const enApelacion = [
    "En Plazo de Apelación",
    "Apelación Recepcionada",
    "Apelación en Revisión por Rectoría",
    "Apelación Resuelta",
  ].includes(causa.estadoActual as string);
  const c11 = !enApelacion || hasBitacoraTipo(causa, "Resolución");
  checks.push({
    id: "apelacion",
    label: "Reconsideración/apelación",
    estado: enApelacion ? (c11 ? "verificada" : "pendiente") : "no_aplica",
    detalle: enApelacion
      ? c11
        ? "Trámite registrado"
        : "Sin registro"
      : "No aplica",
    bloqueante: false,
  });

  const transitionBlockers = [
    ...investigationTransition.blockers,
    ...decisionTransition.blockers,
    ...closureTransition.blockers,
  ].filter((blocker, index, blockers) => blockers.indexOf(blocker) === index);
  checks.push({
    id: "ruta_procedimental",
    label: "Ruta procedimental",
    estado: transitionBlockers.length === 0 ? "verificada" : "bloqueante",
    detalle:
      transitionBlockers.length === 0
        ? "Transiciones procedimentales habilitadas"
        : transitionBlockers.join(" "),
    bloqueante: transitionBlockers.length > 0,
  });

  const verificadas = checks.filter((c) => c.estado === "verificada").length;
  const bloqueantes = checks.filter((c) => c.bloqueante).length;
  const puedeCerrar = bloqueantes === 0;

  const advertencias: string[] = [];
  if (bloqueantes > 0)
    advertencias.push("No cerrar todavía — hay garantías bloqueantes.");
  const sinEvidencia = checks.find(
    (c) => c.id === "evidencias" && c.bloqueante,
  );
  if (sinEvidencia)
    advertencias.push("Existen hechos acreditados sin evidencia vinculada.");
  const sinRice = checks.find((c) => c.id === "rice" && c.bloqueante);
  if (sinRice) advertencias.push("Falta artículo RICE en hechos acreditados.");
  const sinAnalisis = checks.find(
    (c) => c.id === "analisis_hechos" && c.bloqueante,
  );
  if (sinAnalisis)
    advertencias.push("Hechos aún sin calificar — acreditar o descartar.");

  return {
    checks,
    verificadas,
    total: checks.length,
    bloqueantes,
    puedeCerrar,
    advertencias,
  };
}
