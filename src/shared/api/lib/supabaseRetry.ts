/** @license SPDX-License-Identifier: Apache-2.0 */

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 350;

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

type SupabaseResultLike = {
  data?: unknown;
  error?: SupabaseErrorLike | null;
};

function isTransientNetworkError(error: SupabaseErrorLike | null | undefined): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? '';
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('quic') ||
    message.includes('timeout') ||
    error.code === ''
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reintenta únicamente fallos de transporte; errores RLS o SQL no se ocultan. */
export async function withSupabaseReadRetry<T extends SupabaseResultLike>(
  operation: () => PromiseLike<T> | T,
): Promise<T> {
  let result = await operation();

  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (!isTransientNetworkError(result.error)) return result;
    await sleep(RETRY_DELAY_MS * attempt);
    result = await operation();
  }

  return result;
}
