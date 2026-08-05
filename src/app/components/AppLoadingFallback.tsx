/** @license SPDX-License-Identifier: Apache-2.0 */

import ViewLoader from '../../shared/ui/ViewLoader';

export default function AppLoadingFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-100 px-6">
      <ViewLoader view="boot" />
    </div>
  );
}
