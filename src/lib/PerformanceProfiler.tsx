/** @license SPDX-License-Identifier: Apache-2.0 */

import { Profiler, type ReactNode } from 'react';
import { captureEvent } from './posthog';

const MIN_INTERVAL_MS = 5000;
const lastReport = new Map<string, number>();

function onRender(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) {
  const now = Date.now();
  const last = lastReport.get(id) ?? 0;
  if (now - last < MIN_INTERVAL_MS) return;
  lastReport.set(id, now);

  captureEvent('react_render', {
    component_id: id,
    phase,
    actual_duration_ms: Math.round(actualDuration),
    base_duration_ms: Math.round(baseDuration),
    start_time: startTime,
    commit_time: commitTime,
  });
}

export default function PerformanceProfiler({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
