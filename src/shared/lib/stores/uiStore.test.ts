/** @license SPDX-License-Identifier: Apache-2.0 */

import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useUIStore } from './uiStore';

afterEach(() => {
  useUIStore.setState(useUIStore.getInitialState(), true);
});

describe('uiStore', () => {
  it('actualiza la vista y estados del shell', () => {
    useUIStore.getState().setCurrentView('causas');
    useUIStore.getState().setIsSidebarCollapsed(true);
    useUIStore.getState().setMobileShowDetail(true);
    useUIStore.getState().setPrivacyMode(true);

    const state = useUIStore.getState();
    assert.equal(state.currentView, 'causas');
    assert.equal(state.isSidebarCollapsed, true);
    assert.equal(state.mobileShowDetail, true);
    assert.equal(state.privacyMode, true);
  });

  it('permite abrir y alternar el modal de atajos', () => {
    useUIStore.getState().setShowShortcuts(true);
    assert.equal(useUIStore.getState().showShortcuts, true);

    useUIStore.getState().setShowShortcuts((current) => !current);
    assert.equal(useUIStore.getState().showShortcuts, false);
  });

  it('alterna el modo privacidad de forma atomica', () => {
    useUIStore.getState().togglePrivacyMode();
    assert.equal(useUIStore.getState().privacyMode, true);

    useUIStore.getState().togglePrivacyMode();
    assert.equal(useUIStore.getState().privacyMode, false);
  });
});
