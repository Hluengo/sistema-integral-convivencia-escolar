import { useState, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import type { Annotation } from '@/src/types';

GlobalWorkerOptions.workerSrc = workerUrl;

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ') + '\n';
  }
  return text.trim();
}

interface UsePdfProcessingResult {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  isParsing: boolean;
  parsingStatus: string;
  errorMessage: string | null;
  parsedAnnotations: unknown[];
  processPdfFile: (file: File) => Promise<void>;
  handleDrop: (e: React.DragEvent) => Promise<void>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRegisterParsed: () => Promise<void>;
  setErrorMessage: (v: string | null) => void;
  setParsingStatus: (v: string) => void;
  setIsParsing: (v: boolean) => void;
  setParsedAnnotations: (v: unknown[]) => void;
}

export function usePdfProcessing(
  studentId: string,
  student: { id: string; full_name: string },
  onAddAnnotations: (studentId: string, annotations: unknown[]) => void,
  cartasRef: React.MutableRefObject<unknown[]>,
  setEtapas: React.Dispatch<React.SetStateAction<unknown[]>>,
  fetchCartas: (id: string) => Promise<unknown[]>,
  fetchEtapas: (id: string) => Promise<unknown[]>
): UsePdfProcessingResult {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStatus, setParsingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedAnnotations, setParsedAnnotations] = useState<unknown[]>([]);

  const processPdfFile = useCallback(
    async (file: File) => {
      setIsParsing(true);
      setParsingStatus('Leyendo archivo PDF...');
      setErrorMessage(null);
      setParsedAnnotations([]);

      try {
        setParsingStatus('Extrayendo texto del PDF...');
        const textContent = await extractPdfText(file);

        setParsingStatus('Enviando a procesamiento...');

        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/parse-annotations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ fileName: file.name, textContent, studentId }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Error del servidor (${response.status})`);
        }

        const result = await response.json();

        if (result.annotations && result.annotations.length > 0) {
          setParsedAnnotations(result.annotations);
          setParsingStatus(`Se detectaron ${result.annotations.length} anotaciones. Revisa los datos antes de registrar.`);
        } else {
          setParsingStatus('No se detectaron anotaciones en el PDF. Revisa que el archivo contenga datos de hoja de vida.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al procesar el archivo PDF.';
        console.error('Error parsing PDF:', err);
        setErrorMessage(msg);
        setParsingStatus('Error al procesar el archivo');
      } finally {
        setIsParsing(false);
      }
    },
    [studentId]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length === 0) return;
      const file = files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Solo se aceptan archivos PDF.');
        return;
      }
      await processPdfFile(file);
    },
    [processPdfFile]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Solo se aceptan archivos PDF.');
        return;
      }
      await processPdfFile(file);
      e.target.value = '';
    },
    [processPdfFile]
  );

  const handleRegisterParsed = useCallback(async () => {
    if (parsedAnnotations.length === 0) return;
    try {
      setParsingStatus('Registrando anotaciones en la base de datos...');
      const tenantId = useAuthStore.getState().tenantId;
      const annotationsToSave = parsedAnnotations.map((ann: unknown) => {
        const a = ann as Record<string, string | undefined>;
        return {
          student_id: studentId,
          date_time: new Date().toISOString(),
          observation: a.text || a.observation || '',
          severity: a.severity || 'Leve',
          type: a.type || 'Negativa',
          registered_by: a.registered_by || 'Inspectoría',
          tenant_id: tenantId,
        };
      });

      for (const ann of annotationsToSave) {
        const { error } = await supabase.from('inspectorate_records').insert(ann);
        if (error) {
          console.error('Error saving parsed annotation:', error);
          setErrorMessage(`Error al guardar anotacion: ${error.message}`);
          setParsingStatus('Algunas anotaciones no se pudieron registrar.');
          return;
        }
      }

      onAddAnnotations(studentId, annotationsToSave);
      setParsingStatus(`${annotationsToSave.length} anotaciones registradas exitosamente.`);
      setParsedAnnotations([]);

      const [cartasData, etapasData] = await Promise.all([
        fetchCartas(studentId),
        fetchEtapas(studentId),
      ]);
      cartasRef.current = cartasData;
      setEtapas(etapasData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar las anotaciones.';
      console.error('Error registering parsed annotations:', err);
      setErrorMessage(msg);
      setParsingStatus('Error al registrar');
    }
  }, [parsedAnnotations, studentId, onAddAnnotations, cartasRef, setEtapas, fetchCartas, fetchEtapas]);

  return {
    isDragging,
    setIsDragging,
    isParsing,
    parsingStatus,
    errorMessage,
    parsedAnnotations,
    processPdfFile,
    handleDrop,
    handleFileSelect,
    handleRegisterParsed,
    setErrorMessage,
    setParsingStatus,
    setIsParsing,
    setParsedAnnotations,
  };
}