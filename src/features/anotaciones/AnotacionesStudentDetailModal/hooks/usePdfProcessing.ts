import { useState, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { supabase } from '@/src/lib/supabase';
import { saveDocumentAnalysis } from '@/src/shared/api/services/annotations.service';
import type { AnnotationSummary } from '@/src/shared/lib/types';

GlobalWorkerOptions.workerSrc = workerUrl;

async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.md')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al leer el archivo .md'));
      reader.readAsText(file);
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const pageTexts = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then(async (page) => {
        const content = await page.getTextContent();
        return content.items
          .flatMap((item) => ('str' in item ? [(item as { str: string }).str] : []))
          .join(' ');
      })
    )
  );
  return pageTexts.join('\n').trim();
}

function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === 'application/pdf' || name.endsWith('.pdf') || name.endsWith('.md');
}

function getFileTypeLabel(file: File): string {
  return file.name.toLowerCase().endsWith('.md') ? 'MD' : 'PDF';
}

interface UsePdfProcessingResult {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  isParsing: boolean;
  parsingStatus: string;
  errorMessage: string | null;
  summary: AnnotationSummary | null;
  processPdfFile: (file: File) => Promise<void>;
  handleDrop: (e: React.DragEvent) => Promise<void>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  setErrorMessage: (v: string | null) => void;
  setParsingStatus: (v: string) => void;
  setIsParsing: (v: boolean) => void;
  setSummary: (v: AnnotationSummary | null) => void;
  clearAnalysis: () => Promise<void>;
}

export function usePdfProcessing(studentId: string): UsePdfProcessingResult {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStatus, setParsingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnnotationSummary | null>(null);

  const processPdfFile = useCallback(
    async (file: File) => {
      setIsParsing(true);
      const fileType = getFileTypeLabel(file);
      setParsingStatus(`Leyendo archivo ${fileType}...`);
      setErrorMessage(null);
      setSummary(null);

      try {
        setParsingStatus(`Extrayendo texto del ${fileType}...`);
        const textContent = await extractFileText(file);

        if (!textContent || textContent.length < 20) {
          throw new Error(
            `El archivo ${fileType} no contiene texto legible. Si es un PDF escaneado o protegido, conviértelo a Markdown (.md) y súbelo de nuevo.`
          );
        }

        setParsingStatus('Enviando a procesamiento...');

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const response = await fetch('/api/parse-annotations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ fileName: file.name, textContent, studentId }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          let errMsg = `Error del servidor (${response.status})`;
          try {
            const errData = JSON.parse(text);
            if (errData.error) errMsg = errData.error;
          } catch {
            if (response.status === 504)
              errMsg =
                'El procesamiento excedió el tiempo límite. Intenta con un archivo .md más corto o divide el PDF en páginas individuales.';
            else if (text) errMsg = text.slice(0, 200);
          }
          throw new Error(errMsg);
        }

        const result = await response.json();

        if (result.success && result.summary) {
          const s = result.summary as AnnotationSummary;
          setSummary(s);

          try {
            await saveDocumentAnalysis({
              studentId,
              fileName: file.name,
              negativas: s.negativas,
              positivas: s.positivas,
              informativas: s.informativas,
            });
          } catch (saveErr) {
            console.error('Error guardando análisis en DB:', saveErr);
          }

          const total = s.negativas + s.positivas + s.informativas;
          if (total > 0) {
            const parts = [`${s.negativas} negativas`, `${s.positivas} positivas`];
            if (s.informativas > 0) parts.push(`${s.informativas} informativas`);
            setParsingStatus(`Se detectaron ${total} anotaciones (${parts.join(', ')}).`);
          } else {
            setParsingStatus(
              `No se detectaron anotaciones en el ${fileType}. Revisa que el archivo contenga datos de hoja de vida.`
            );
          }
        } else {
          setParsingStatus(
            `No se detectaron anotaciones en el ${fileType}. Revisa que el archivo contenga datos de hoja de vida.`
          );
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : `Error al procesar el archivo ${fileType}.`;
        console.error(`Error parsing ${fileType}:`, err);
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
      if (!isSupportedFile(file)) {
        setErrorMessage('Solo se aceptan archivos PDF y Markdown (.md).');
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
      if (!isSupportedFile(file)) {
        setErrorMessage('Solo se aceptan archivos PDF y Markdown (.md).');
        return;
      }
      await processPdfFile(file);
      e.target.value = '';
    },
    [processPdfFile]
  );

  const clearAnalysis = useCallback(async () => {
    setSummary(null);
    await supabase.from('document_analyses').delete().eq('student_id', studentId);
  }, [studentId]);

  return {
    isDragging,
    setIsDragging,
    isParsing,
    parsingStatus,
    errorMessage,
    summary,
    processPdfFile,
    handleDrop,
    handleFileSelect,
    setErrorMessage,
    setParsingStatus,
    setIsParsing,
    setSummary,
    clearAnalysis,
  };
}
