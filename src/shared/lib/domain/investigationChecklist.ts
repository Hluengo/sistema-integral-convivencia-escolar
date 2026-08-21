/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  EstadoCausa,
  type BitacoraEntry,
  type Causa,
  type ChecklistItem,
  type FaseProcedimental,
} from '../types';

export const INVESTIGATION_BASE_ITEM_IDS = ['chk_inv_1', 'chk_inv_2'] as const;
export const MEDIATION_FLOW_ITEM_IDS = ['chk_inv_3', 'chk_inv_4'] as const;
export const MEDIATION_OUTCOME_ITEM_IDS = ['chk_inv_5', 'chk_inv_6'] as const;
export const INVESTIGATION_ITEM_IDS = [
  ...INVESTIGATION_BASE_ITEM_IDS,
  ...MEDIATION_FLOW_ITEM_IDS,
  ...MEDIATION_OUTCOME_ITEM_IDS,
] as const;

export const PHASE_PREFIXES: Readonly<Record<FaseProcedimental, string>> = {
  Recepción: 'chk_rec',
  Investigación: 'chk_inv',
  Resolución: 'chk_res',
  Apelación: 'chk_imp',
  Seguimiento: 'chk_seg',
};

/**
 * Hitos operativos visibles en la ruta. Los IDs omitidos se conservan para
 * reconstruir expedientes históricos, pero representan estados transitorios
 * que no requieren un registro independiente.
 */
export const ACTIVE_PHASE_ITEM_IDS: Readonly<Record<FaseProcedimental, readonly string[]>> = {
  Recepción: ['chk_rec_1', 'chk_rec_2', 'chk_rec_3'],
  Investigación: INVESTIGATION_ITEM_IDS,
  Resolución: ['chk_res_2', 'chk_res_4', 'chk_res_6'],
  Apelación: ['chk_imp_1', 'chk_imp_2', 'chk_imp_4', 'chk_imp_5'],
  Seguimiento: ['chk_seg_1', 'chk_seg_3', 'chk_seg_4'],
};

type InvestigationItemId = (typeof INVESTIGATION_ITEM_IDS)[number];
type MediationOutcome = 'agreement' | 'failed' | null;

interface CausaChecklistContext {
  estadoActual?: EstadoCausa;
  bitacora?: BitacoraEntry[];
  checklistDebidoProceso: ChecklistItem[];
}

export interface ChecklistProgress {
  total: number;
  completed: number;
}

export interface InvestigationChecklistModel {
  mediationActive: boolean;
  mediationOutcome: MediationOutcome;
  baseItems: ChecklistItem[];
  mediationFlowItems: ChecklistItem[];
  agreementItem: ChecklistItem | null;
  failedItem: ChecklistItem | null;
  applicableItems: ChecklistItem[];
  progress: ChecklistProgress;
  nextItem: ChecklistItem | null;
}

const MEDIATION_STATES = new Set<EstadoCausa>([
  EstadoCausa.DERIVADO_A_MEDIACION,
  EstadoCausa.MEDIACION_EN_DESARROLLO,
  EstadoCausa.MEDIACION_CERRADA_ACUERDO,
  EstadoCausa.MEDIACION_FRACASADA_RETORNO,
]);

const MEDIATION_TEXT_PATTERN = /mediaci[oó]n/i;

function isInvestigationItemId(id: string): id is InvestigationItemId {
  return (INVESTIGATION_ITEM_IDS as readonly string[]).includes(id);
}

function itemHasPersistentEvidence(item: ChecklistItem): boolean {
  return Boolean(
    item.completado ||
    item.fechaCompletado ||
    item.registradoPor ||
    item.observaciones ||
    item.documentoNombre ||
    item.documentoUrl,
  );
}

function entryHasMediationEvidence(entry: BitacoraEntry): boolean {
  return (
    entry.tipo === 'Mediación' ||
    MEDIATION_TEXT_PATTERN.test(entry.titulo) ||
    MEDIATION_TEXT_PATTERN.test(entry.descripcion) ||
    Boolean(entry.documentoAdjunto && MEDIATION_TEXT_PATTERN.test(entry.documentoAdjunto))
  );
}

function itemById(checklist: ChecklistItem[], id: string): ChecklistItem | null {
  return checklist.find((item) => item.id === id) ?? null;
}

function completedItemIds(checklist: ChecklistItem[]): Set<string> {
  return new Set(checklist.filter((item) => item.completado).map((item) => item.id));
}

function filterChecklistByIds(checklist: ChecklistItem[], ids: readonly string[]): ChecklistItem[] {
  const allowedIds = new Set(ids);
  return checklist.filter((item) => allowedIds.has(item.id));
}

export function isMediationState(estadoActual: EstadoCausa | undefined): boolean {
  return estadoActual ? MEDIATION_STATES.has(estadoActual) : false;
}

export function isMediationActive(causa: CausaChecklistContext): boolean {
  if (isMediationState(causa.estadoActual)) return true;

  if (
    causa.checklistDebidoProceso.some(
      (item) =>
        isInvestigationItemId(item.id) &&
        (MEDIATION_FLOW_ITEM_IDS as readonly string[])
          .concat(MEDIATION_OUTCOME_ITEM_IDS)
          .includes(item.id) &&
        itemHasPersistentEvidence(item),
    )
  ) {
    return true;
  }

  return causa.bitacora?.some(entryHasMediationEvidence) ?? false;
}

export function getMediationOutcome(checklist: ChecklistItem[]): MediationOutcome {
  const completedIds = completedItemIds(checklist);
  if (completedIds.has('chk_inv_5')) return 'agreement';
  if (completedIds.has('chk_inv_6')) return 'failed';
  return null;
}

export function getApplicableInvestigationItemIds(causa: CausaChecklistContext): string[] {
  if (!isMediationActive(causa)) {
    return [...INVESTIGATION_BASE_ITEM_IDS];
  }

  const outcome = getMediationOutcome(causa.checklistDebidoProceso);
  const ids = [...INVESTIGATION_BASE_ITEM_IDS, ...MEDIATION_FLOW_ITEM_IDS];

  if (outcome === 'agreement') return [...ids, 'chk_inv_5'];
  if (outcome === 'failed') return [...ids, 'chk_inv_6'];
  return [...ids, ...MEDIATION_OUTCOME_ITEM_IDS];
}

export function getInvestigationChecklistProgress(causa: CausaChecklistContext): ChecklistProgress {
  const checklist = causa.checklistDebidoProceso;
  const byId = new Map(checklist.map((item) => [item.id, item]));
  const countCompleted = (ids: readonly string[]) =>
    ids.reduce((count, id) => count + (byId.get(id)?.completado ? 1 : 0), 0);
  const countExisting = (ids: readonly string[]) =>
    ids.reduce((count, id) => count + (byId.has(id) ? 1 : 0), 0);

  const baseTotal = countExisting(INVESTIGATION_BASE_ITEM_IDS);
  const baseCompleted = countCompleted(INVESTIGATION_BASE_ITEM_IDS);
  if (!isMediationActive(causa)) {
    return { total: baseTotal, completed: baseCompleted };
  }

  const flowTotal = countExisting(MEDIATION_FLOW_ITEM_IDS);
  const flowCompleted = countCompleted(MEDIATION_FLOW_ITEM_IDS);
  const hasOutcomeSlot = MEDIATION_OUTCOME_ITEM_IDS.some((id) => byId.has(id));
  const outcomeCompleted = MEDIATION_OUTCOME_ITEM_IDS.some((id) => byId.get(id)?.completado)
    ? 1
    : 0;

  return {
    total: baseTotal + flowTotal + (hasOutcomeSlot ? 1 : 0),
    completed: baseCompleted + flowCompleted + outcomeCompleted,
  };
}

export function getInvestigationChecklistModel(causa: Causa): InvestigationChecklistModel {
  const checklist = causa.checklistDebidoProceso;
  const mediationActive = isMediationActive(causa);
  const mediationOutcome = getMediationOutcome(checklist);
  const applicableItemIds = getApplicableInvestigationItemIds(causa);
  const applicableItems = filterChecklistByIds(checklist, applicableItemIds);
  const progress = getInvestigationChecklistProgress(causa);

  return {
    mediationActive,
    mediationOutcome,
    baseItems: filterChecklistByIds(checklist, INVESTIGATION_BASE_ITEM_IDS),
    mediationFlowItems: filterChecklistByIds(checklist, MEDIATION_FLOW_ITEM_IDS),
    agreementItem: itemById(checklist, 'chk_inv_5'),
    failedItem: itemById(checklist, 'chk_inv_6'),
    applicableItems,
    progress,
    nextItem: getNextInvestigationChecklistItem(causa),
  };
}

export function getNextInvestigationChecklistItem(
  causa: CausaChecklistContext,
): ChecklistItem | null {
  const checklist = causa.checklistDebidoProceso;
  const byId = new Map(checklist.map((item) => [item.id, item]));
  const requiredIds = isMediationActive(causa)
    ? [...INVESTIGATION_BASE_ITEM_IDS, ...MEDIATION_FLOW_ITEM_IDS]
    : [...INVESTIGATION_BASE_ITEM_IDS];

  for (const id of requiredIds) {
    const item = byId.get(id);
    if (item && !item.completado) return item;
  }

  if (!isMediationActive(causa) || getMediationOutcome(checklist)) {
    return null;
  }

  return (
    MEDIATION_OUTCOME_ITEM_IDS.map((id) => byId.get(id)).find((item): item is ChecklistItem =>
      Boolean(item && !item.completado),
    ) ?? null
  );
}

export function getApplicableChecklistItems(
  causa: CausaChecklistContext,
  phase: FaseProcedimental,
): ChecklistItem[] {
  if (phase === 'Investigación') {
    return getApplicableInvestigationItems(causa);
  }

  const activeIds = new Set(ACTIVE_PHASE_ITEM_IDS[phase]);
  return causa.checklistDebidoProceso.filter((item) => activeIds.has(item.id));
}

export function getApplicableInvestigationItems(causa: CausaChecklistContext): ChecklistItem[] {
  return filterChecklistByIds(
    causa.checklistDebidoProceso,
    getApplicableInvestigationItemIds(causa),
  );
}
