/** @license SPDX-License-Identifier: Apache-2.0 */

import { createContext, useContext } from 'react';
import type { AppContextValue } from './AppContext';

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) { throw new Error('useAppContext debe usarse dentro de AppProvider'); }
  return ctx;
}
