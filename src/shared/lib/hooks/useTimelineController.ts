/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import type { Causa, UserRole } from '../../../types';
import { useAuditDraft } from './useAuditDraft';
import { useChecklistRegistration } from './useChecklistRegistration';
import { useDocumentManager } from './useDocumentManager';
import { useBitacoraLog } from './useBitacoraLog';

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
  const checklist = useChecklistRegistration({ causa, onUpdateCausa, currentRole, privacyMode });
  const documents = useDocumentManager({ causa, onUpdateCausa, currentRole, privacyMode, regName: checklist.regName });
  const log = useBitacoraLog({ causa, onUpdateCausa });

  const contextValue = useMemo(() => ({
    causa,
    currentRole,
    privacyMode,
    onUpdateCausa,
    ...checklist,
    ...documents,
    ...log,
    ...audit,
  }), [causa, currentRole, privacyMode, onUpdateCausa, checklist, documents, log, audit]);

  return contextValue;
}
