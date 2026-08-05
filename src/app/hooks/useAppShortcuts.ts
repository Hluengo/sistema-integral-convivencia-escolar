/** @license SPDX-License-Identifier: Apache-2.0 */

import { useKeyboardShortcuts } from '../../shared/lib/hooks/useKeyboardShortcuts';

interface UseAppShortcutsArgs {
  openCreateForm: () => void;
  closeCreateForm: () => void;
  closeLoginModal: () => void;
  setShowShortcuts: (show: boolean | ((previous: boolean) => boolean)) => void;
  showCreateForm: boolean;
  showLoginModal: boolean;
  showShortcuts: boolean;
}

export function useAppShortcuts({
  openCreateForm,
  closeCreateForm,
  closeLoginModal,
  setShowShortcuts,
  showCreateForm,
  showLoginModal,
  showShortcuts,
}: UseAppShortcutsArgs) {
  useKeyboardShortcuts({
    onNewCausa: openCreateForm,
    onToggleShortcuts: () => setShowShortcuts((previous) => !previous),
    onCloseCreateForm: closeCreateForm,
    onCloseLoginModal: closeLoginModal,
    onCloseShortcuts: () => setShowShortcuts(false),
    showCreateForm,
    showLoginModal,
    showShortcuts,
  });
}
