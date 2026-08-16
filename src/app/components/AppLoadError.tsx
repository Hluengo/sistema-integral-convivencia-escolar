/** @license SPDX-License-Identifier: Apache-2.0 */

import Button from '../../shared/ui/Button';

interface AppLoadErrorProps {
  message: string;
  onRetry: () => void;
}

export default function AppLoadError({ message, onRetry }: AppLoadErrorProps) {
  return (
    <div
      role="alert"
      className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 px-4 py-3 text-sm text-gravisima-700 sm:mx-6"
    >
      <span>{message}</span>
      <Button variant="danger" onClick={onRetry} className="rounded-lg px-3 py-1.5">
        Reintentar
      </Button>
    </div>
  );
}
