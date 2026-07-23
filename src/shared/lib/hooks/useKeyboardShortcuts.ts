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
  const {
    onNewCausa,
    onToggleShortcuts,
    onCloseCreateForm,
    onCloseLoginModal,
    onCloseShortcuts,
    showCreateForm,
    showLoginModal,
    showShortcuts,
  } = handlers;

  const handleOpenCreateFormRef = useRef(onNewCausa);

  useEffect(() => {
    handleOpenCreateFormRef.current = onNewCausa;
  }, [onNewCausa]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleOpenCreateFormRef.current();
      } else if (e.key === '?') {
        e.preventDefault();
        onToggleShortcuts();
      } else if (e.key === 'Escape') {
        if (showCreateForm) onCloseCreateForm();
        else if (showLoginModal) onCloseLoginModal();
        else if (showShortcuts) onCloseShortcuts();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    showCreateForm,
    showLoginModal,
    showShortcuts,
    onToggleShortcuts,
    onCloseCreateForm,
    onCloseLoginModal,
    onCloseShortcuts,
  ]);
}