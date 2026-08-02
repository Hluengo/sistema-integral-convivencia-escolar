/** @license SPDX-License-Identifier: Apache-2.0 */

import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useToastStore } from './toastStore';

afterEach(() => {
  for (const toast of useToastStore.getState().toasts) {
    useToastStore.getState().removeToast(toast.id);
  }
});

describe('toastStore', () => {
  it('agrega y remueve una notificación', () => {
    useToastStore.getState().addToast('success', 'Caso guardado');

    const [toast] = useToastStore.getState().toasts;
    assert.ok(toast);
    assert.equal(toast.type, 'success');
    assert.equal(toast.message, 'Caso guardado');

    useToastStore.getState().removeToast(toast.id);
    assert.deepEqual(useToastStore.getState().toasts, []);
  });

  it('ignora ids inexistentes al remover', () => {
    useToastStore.getState().removeToast('toast-inexistente');
    assert.deepEqual(useToastStore.getState().toasts, []);
  });
});
