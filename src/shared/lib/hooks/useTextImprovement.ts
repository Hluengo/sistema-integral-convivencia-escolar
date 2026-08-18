/** @license SPDX-License-Identifier: Apache-2.0 */
import { useState, useCallback } from 'react';
import { supabase } from '../../api/lib/supabase';

export type TextImprovementContext =
  'relato_causa' | 'observaciones_causa' | 'hito_observacion' | 'bitacora_manual' | 'cierre_causa';

interface TextImprovementResponse {
  improved?: unknown;
  warning?: unknown;
}

const TEXT_IMPROVEMENT_CLIENT_TIMEOUT_MS = 9_000;
const TEXT_IMPROVEMENT_TIMEOUT_MESSAGE =
  'La IA tardó demasiado en responder. El contenido original se mantuvo sin cambios.';

export function useTextImprovement() {
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const improveText = useCallback(
    async (text: string, context?: TextImprovementContext): Promise<string | null> => {
      if (!text.trim()) {
        return null;
      }
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsImproving(true);
        setError(null);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        const controller = new AbortController();
        const timeoutId = window.setTimeout(
          () => controller.abort(),
          TEXT_IMPROVEMENT_CLIENT_TIMEOUT_MS,
        );
        const response = await fetch('/api/improve-text', {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({ text, context }),
        }).finally(() => window.clearTimeout(timeoutId));
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Debe iniciar sesión para usar esta función.');
          }
          const err = await response.json().catch(() => ({ error: 'Error de redacción' }));
          throw new Error(err.error || 'Error al mejorar el texto');
        }
        const data = (await response.json()) as TextImprovementResponse;
        if (typeof data.warning === 'string') {
          setError(data.warning);
        }
        return typeof data.improved === 'string' ? data.improved : null;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          setError(TEXT_IMPROVEMENT_TIMEOUT_MESSAGE);
          return null;
        }
        const msg = e instanceof Error ? e.message : 'Error al mejorar el texto';
        setError(msg);
        return null;
      } finally {
        setIsImproving(false);
      }
    },
    [],
  );

  return { improveText, isImproving, error };
}
