/** @license SPDX-License-Identifier: Apache-2.0 */

import type React from 'react';

export function AppProvider({ children }: { children: React.ReactNode; value?: unknown }) {
  return <>{children}</>;
}
