/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Causa, EstadoCausa, BitacoraEntry, ChecklistItem, UserRole } from '../types';
import { useAuditDraft } from './useAuditDraft';
import { useProcessRegistration } from './useProcessRegistration';

interface TimelineControllerArgs {
  causa: Causa;
  onUpdateCausa: (updated: Causa) => void;
  currentRole: UserRole;
  privacyMode: boolean;
}

export function useTimelineController({
  causa,
  onUpdateCausa,
  currentRole,
  privacyMode,
}: TimelineControllerArgs) {
  const audit = useAuditDraft({ causa });
  const registration = useProcessRegistration({ causa, onUpdateCausa, currentRole, privacyMode });

  return {
    ...audit,
    ...registration,
  };
}
