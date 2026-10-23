/** @license SPDX-License-Identifier: Apache-2.0 */

import { useAuthStore } from "../stores/authStore";
import { getSessionDraftKey } from "../sessionDraft";

export function useSessionDraftKey(form: string, recordId?: string) {
  const userId = useAuthStore((state) => state.user?.id);
  const tenantId = useAuthStore((state) => state.tenantId);
  return getSessionDraftKey(form, tenantId, userId, recordId);
}
