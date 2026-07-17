/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

interface ShortcutHandlers {
  onNewCausa: () => void;
  onToggleShortcuts: () => void;
  onCloseCreateForm: () => void;
  onCloseLoginModal: () => void;
  onCloseShortcuts: () => void;
  showCreateForm: boolean;
  showLoginModal: boolean;
  showShortcuts: boolean;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleOpenCreateFormRef = useRef(handlers.onNewCausa);
  useEffect(() => {
    handleOpenCreateFormRef.current = handlers.onNewCausa;
  }, [handlers.onNewCausa]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
      if (isInput) return;

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleOpenCreateFormRef.current();
      } else if (e.key === '?') {
        e.preventDefault();
        handlers.onToggleShortcuts();
      } else if (e.key === 'Escape') {
        if (handlers.showCreateForm) handlers.onCloseCreateForm();
        else if (handlers.showLoginModal) handlers.onCloseLoginModal();
        else if (handlers.showShortcuts) handlers.onCloseShortcuts();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    handlers.showCreateForm,
    handlers.showLoginModal,
    handlers.showShortcuts,
    handlers.onToggleShortcuts,
    handlers.onCloseCreateForm,
    handlers.onCloseLoginModal,
    handlers.onCloseShortcuts,
  ]);
}
