import { useState, useCallback } from 'react';

export function useTextImprovement() {
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const improveText = useCallback(async (text: string): Promise<string | null> => {
    if (!text.trim()) return null;
    setIsImproving(true);
    setError(null);
    try {
      const response = await fetch('/api/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
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