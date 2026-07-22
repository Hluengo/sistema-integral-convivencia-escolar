/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { checkRateLimit } from '../lib/rateLimit';
import { createClient } from '@supabase/supabase-js';

const router = Router();

router.post('/process-disciplinary-pdf', async (req, res) => {
  try {
    const { textContent, fileName, studentId, tenantId } = req.body as {
      textContent?: string;
      fileName?: string;
      studentId?: string;
      tenantId?: string;
    };

    if (!textContent || !fileName || !studentId || !tenantId) {
      res.status(400).json({ error: 'Faltan parámetros requeridos' });
      return;
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const lines = textContent
      .split('\n')
      .filter((l) => !l.trim().startsWith('![') && !l.includes('data:image'));

    const blocks: string[] = [];
    let current: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
        if (current.length > 0) blocks.push(current.join('\n'));
        current = [line];
      } else if (current.length > 0) {
        current.push(line);
      }
    }
    if (current.length > 0) blocks.push(current.join('\n'));

    const summary = { negativas: 0, positivas: 0, informativas: 0 };
    const detectedAnnotations: Array<{
      type: string;
      text: string;
      lineNumber: number;
      date?: string;
      teacher?: string;
    }> = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const typeMatch = block.match(/Tipo:\s*(Negativa|Positiva|Informaci[oó]n)/i);
      if (typeMatch) {
        const t = typeMatch[1].toLowerCase();
        const type = t.startsWith('neg')
          ? 'Negativa'
          : t.startsWith('pos')
            ? 'Positiva'
            : 'Información';
        if (type === 'Negativa') summary.negativas++;
        else if (type === 'Positiva') summary.positivas++;
        else summary.informativas++;
        const dateMatch = block.match(/(\d{2}\/\d{2}\/\d{4})/);
        const teacherMatch = block.match(/Profesor:\s*([^\n]+)/i);
        const textLines = block
          .split('\n')
          .filter(
            (l) =>
              !l.includes('Tipo:') && !l.includes('Profesor:') && !l.match(/^\d{2}\/\d{2}\/\d{4}/)
          );
        detectedAnnotations.push({
          type,
          text: textLines.join(' ').trim(),
          lineNumber: i + 1,
          date: dateMatch?.[1],
          teacher: teacherMatch?.[1]?.trim(),
        });
      }
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? '';
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ error: 'Supabase no configurado' });
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const { data: suggestedLetter } = await supabase.rpc('get_suggested_letter_type', {
      p_negativas: summary.negativas,
      p_positivas: summary.positivas,
      p_informativas: summary.informativas,
      p_tenant_id: tenantId,
    });

    const { data: processNumber, error: numberError } = await supabase.rpc(
      'generate_process_number',
      { p_tenant_id: tenantId }
    );
    if (numberError) {
      res.status(500).json({ error: 'Error al generar número de proceso' });
      return;
    }

    const { data: dpRow, error: processError } = await supabase
      .from('disciplinary_processes')
      .insert({
        student_id: studentId,
        process_number: processNumber,
        status: 'draft',
        tenant_id: tenantId,
        suggested_letter_type: suggestedLetter || 'none',
        total_negativas: summary.negativas,
        total_positivas: summary.positivas,
        total_informativas: summary.informativas,
        is_completed: false,
      })
      .select()
      .single();

    if (processError || !dpRow) {
      res.status(500).json({ error: 'Error al crear proceso' });
      return;
    }
    const dpId = (dpRow as Record<string, string>).id;
    const dpNumber = (dpRow as Record<string, string>).process_number;

    if (detectedAnnotations.length > 0) {
      await supabase.from('disciplinary_annotations_detected').insert(
        detectedAnnotations.map((ann) => ({
          process_id: dpId,
          student_id: studentId,
          annotation_type: ann.type,
          annotation_text: ann.text,
          line_number: ann.lineNumber,
          annotation_date: ann.date ? new Date(ann.date.split('/').reverse().join('-')) : null,
          teacher_name: ann.teacher,
          tenant_id: tenantId,
        }))
      );
    }

    await supabase.from('document_analyses').insert({
      student_id: studentId,
      file_name: fileName,
      negativas: summary.negativas,
      positivas: summary.positivas,
      informativas: summary.informativas,
      tenant_id: tenantId,
    });

    res.json({
      success: true,
      processId: dpId,
      processNumber: dpNumber,
      summary,
      suggestedLetterType: suggestedLetter || 'none',
      detectedAnnotationsCount: detectedAnnotations.length,
    });
  } catch (error) {
    console.error('Error processing disciplinary PDF:', error);
    res.status(500).json({ error: 'Error interno al procesar el documento' });
  }
});

export default router;
