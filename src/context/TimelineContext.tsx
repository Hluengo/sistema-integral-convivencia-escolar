/** @license SPDX-License-Identifier: Apache-2.0 */

import React from 'react';
import { TimelineContext } from './useTimelineContext';

export function TimelineProvider({ children, value }: { children: React.ReactNode; value: React.ComponentProps<typeof TimelineContext.Provider>['value'] }) {
  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}
