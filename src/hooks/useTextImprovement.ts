import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useTextImprovement() {
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const improveText = useCallback(async (text: string): Promise<string | null> => {
    if (!text.trim()) { return null; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsImproving(true);
      setError(null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const response = await fetch('/api/improve-text', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Debe iniciar sesión para usar esta función.');
        }
        const err = await response.json().catch(() => ({ error: 'Error de redacción' }));
        throw new Error(err.error || 'Error al mejorar el texto');
      }
      const data = await response.json();
      return data.improved;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al mejorar el texto';
      setError(msg);
      return null;
    } finally {
      setIsImproving(false);
    }
  }, []);

  return { improveText, isImproving, error };
}