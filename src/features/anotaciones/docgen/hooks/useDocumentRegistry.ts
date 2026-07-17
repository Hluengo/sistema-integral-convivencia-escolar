import { useState, useEffect, useCallback } from 'react';

interface EmittedEntry {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  docType: string;
  emissionDate: string;
  status: string;
  apoderadoName: string;
  student_name?: string;
  emission_date?: string;
}

const STORAGE_KEY = 'convivencia_anotaciones_emitted:v1';

export function useDocumentRegistry() {
  const [emittedList, setEmittedList] = useState<EmittedEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setEmittedList(JSON.parse(stored));
      }
    } catch {
      // Silently ignore corrupt localStorage data
    }
  }, []);

  const addEntry = useCallback((entry: Omit<EmittedEntry, 'id'>) => {
    const newEntry: EmittedEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    setEmittedList((prev) => {
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  const clearRegistry = useCallback(() => {
    setEmittedList([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    emittedList,
    addEntry,
    clearRegistry,
  };
}