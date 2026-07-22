/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { checkRateLimit } from '../lib/rateLimit';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractStudentName(text: string): string | null {
  const lines = text.split('\n');
  const headings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('## ')) continue;
    const content = trimmed.slice(3).trim();
    if (/^(FUNDACIÓN|Saber|FICHA|Rango|Curso|Fecha)/i.test(content)) continue;
    if (content.length < 2) continue;
    headings.push(content);
  }

  if (headings.length >= 3) {
    const apellido1 = headings[0];
    const apellido2 = headings[1];
    const nombres = headings.slice(2).join(' ');
    return `${apellido1} ${apellido2} ${nombres}`;
  }
  if (headings.length === 2) {
    return `${headings[0]} ${headings[1]}`;
  }
  if (headings.length === 1) {
    return headings[0];
  }
  return null;
}

function extractCourse(text: string): string | null {
  const match = text.match(/Curso\s*:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

async function findStudent(
  supabase: ReturnType<typeof createClient>,
  fullName: string,
  courseName: string | null,
  tenantId: string
): Promise<Array<{ id: string; full_name: string; rut: string; course_name: string | null }>> {
  const normalized = normalizeName(fullName);
  const nameParts = normalized.split(/\s+/).filter(Boolean);

  const makeQuery = () =>
    supabase.from('students').select('id, full_name, rut, course_id').eq('tenant_id', tenantId);

  const enrichWithCourse = async (
    rows: Array<{ id: string; full_name: string; rut: string; course_id: string }>
  ) => {
    if (rows.length === 0) return [];
    const courseIds = [...new Set(rows.map((r) => r.course_id))];
    const { data: courses } = await supabase.from('courses').select('id, name').in('id', courseIds);
    const courseMap = new Map(
      (courses || []).map((c: { id: string; name: string }) => [c.id, c.name])
    );
    return rows.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      rut: r.rut,
      course_name: courseMap.get(r.course_id) || null,
    }));
  };

  const { data: exact } = await makeQuery().ilike('full_name', fullName.trim()).limit(5);
  if (exact && exact.length > 0) return enrichWithCourse(exact);

  const { data: normalizedMatch } = await makeQuery()
    .ilike('full_name', `%${normalized}%`)
    .limit(5);
  if (normalizedMatch && normalizedMatch.length > 0) return enrichWithCourse(normalizedMatch);

  for (const part of nameParts) {
    if (part.length < 3) continue;
    const { data: byPart } = await makeQuery().ilike('full_name', `%${part}%`).limit(5);
    if (byPart && byPart.length > 0) return enrichWithCourse(byPart);
  }

  const lastName = nameParts[0];
  if (lastName && lastName.length >= 3) {
    const { data: byLastName } = await makeQuery().ilike('full_name', `${lastName}%`).limit(10);
    if (byLastName && byLastName.length > 0) return enrichWithCourse(byLastName);
  }

  if (courseName) {
    const normalizedCourse = normalizeName(courseName);
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', `%${normalizedCourse}%`)
      .maybeSingle();
    if (course) {
      const { data: courseStudents } = await makeQuery().eq('course_id', course.id).limit(50);
      if (courseStudents && courseStudents.length > 0) return enrichWithCourse(courseStudents);
    }
  }

  return [];
}

function parseAnnotations(textContent: string): {
  summary: { negativas: number; positivas: number; informativas: number };
  detectedAnnotations: Array<{
    type: string;
    text: string;
    lineNumber: number;
    date?: string;
    teacher?: string;
    category?: string;
  }>;
} {
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
    category?: string;
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
      const categoryMatch = block.match(/Categoría:\s*([^\n]+)/i);
      const textLines = block
        .split('\n')
        .filter(
          (l) =>
            !l.includes('Tipo:') &&
            !l.includes('Profesor:') &&
            !l.includes('Categoría:') &&
            !l.match(/^\d{2}\/\d{2}\/\d{4}/)
        );
      detectedAnnotations.push({
        type,
        text: textLines.join(' ').trim(),
        lineNumber: i + 1,
        date: dateMatch?.[1],
        teacher: teacherMatch?.[1]?.trim(),
        category: categoryMatch?.[1]?.trim(),
      });
    }
  }

  return { summary, detectedAnnotations };
}

router.post('/process-disciplinary-pdf', async (req, res) => {
  try {
    const { textContent, fileName, studentId, tenantId, storagePath } = req.body as {
      textContent?: string;
      fileName?: string;
      studentId?: string;
      tenantId?: string;
      storagePath?: string;
    };

    if (!textContent || !fileName) {
      res.status(400).json({ error: 'Faltan parámetros requeridos: textContent y fileName' });
      return;
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const { summary, detectedAnnotations } = parseAnnotations(textContent);
    const detectedName = extractStudentName(textContent);
    const detectedCourse = extractCourse(textContent);

    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? '';
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ error: 'Supabase no configurado' });
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const resolvedTenantId = tenantId || process.env.DEFAULT_TENANT_ID || '';

    const suggestedLetter = resolvedTenantId
      ? await supabase
          .rpc('get_suggested_letter_type', {
            p_negativas: summary.negativas,
            p_positivas: summary.positivas,
            p_informativas: summary.informativas,
            p_tenant_id: resolvedTenantId,
          })
          .then((r) => r.data)
      : null;

    let detectedStudents: Array<{
      id: string;
      full_name: string;
      rut: string;
      course_name: string | null;
    }> = [];

    if (detectedName && resolvedTenantId) {
      detectedStudents = await findStudent(
        supabase,
        detectedName,
        detectedCourse,
        resolvedTenantId
      );
    }

    const resolvedStudentId =
      studentId || (detectedStudents.length === 1 ? detectedStudents[0].id : null);
    const resolvedStudentName = studentId
      ? null
      : detectedStudents.length === 1
        ? detectedStudents[0].full_name
        : detectedName;

    if (!resolvedTenantId) {
      res.json({
        success: true,
        mode: 'preview',
        summary,
        detectedName,
        detectedCourse,
        detectedStudents: [],
        suggestedLetterType: null,
        detectedAnnotations,
        detectedAnnotationsCount: detectedAnnotations.length,
      });
      return;
    }

    if (!resolvedStudentId) {
      res.json({
        success: true,
        mode: 'student_pending',
        summary,
        detectedName,
        detectedCourse,
        detectedStudents,
        suggestedLetterType: suggestedLetter || 'none',
        detectedAnnotations,
        detectedAnnotationsCount: detectedAnnotations.length,
      });
      return;
    }

    const { data: processNumber, error: numberError } = await supabase.rpc(
      'generate_process_number',
      { p_tenant_id: resolvedTenantId }
    );
    if (numberError) {
      res.status(500).json({ error: 'Error al generar número de proceso' });
      return;
    }

    const { data: dpRow, error: processError } = await supabase
      .from('disciplinary_processes')
      .insert({
        student_id: resolvedStudentId,
        process_number: processNumber,
        status: 'draft',
        tenant_id: resolvedTenantId,
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

    if (storagePath) {
      await supabase.from('disciplinary_process_files').insert({
        process_id: dpId,
        file_name: fileName,
        storage_path: storagePath,
        file_size: 0,
        mime_type: fileName.toLowerCase().endsWith('.md') ? 'text/markdown' : 'application/pdf',
        tenant_id: resolvedTenantId,
      });
    }

    if (detectedAnnotations.length > 0) {
      await supabase.from('disciplinary_annotations_detected').insert(
        detectedAnnotations.map((ann) => ({
          process_id: dpId,
          student_id: resolvedStudentId,
          annotation_type: ann.type,
          annotation_text: ann.text,
          line_number: ann.lineNumber,
          annotation_date: ann.date ? new Date(ann.date.split('/').reverse().join('-')) : null,
          teacher_name: ann.teacher,
          category: ann.category,
          tenant_id: resolvedTenantId,
        }))
      );
    }

    await supabase.from('document_analyses').insert({
      student_id: resolvedStudentId,
      file_name: fileName,
      negativas: summary.negativas,
      positivas: summary.positivas,
      informativas: summary.informativas,
      tenant_id: resolvedTenantId,
    });

    res.json({
      success: true,
      mode: 'completed',
      processId: dpId,
      processNumber: dpNumber,
      summary,
      detectedName: resolvedStudentName,
      detectedCourse,
      detectedStudents,
      suggestedLetterType: suggestedLetter || 'none',
      detectedAnnotationsCount: detectedAnnotations.length,
    });
  } catch (error) {
    console.error('Error processing disciplinary PDF:', error);
    res.status(500).json({ error: 'Error interno al procesar el documento' });
  }
});

export default router;
