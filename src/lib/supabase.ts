/**
 * Supabase client configuration
 * Connects to Supabase for authentication, data storage, and file storage.
 */

import { createClient } from '@supabase/supabase-js';
import type { Causa, BitacoraEntry, ChecklistItem } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Créalas en el archivo .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/** Types matching the Supabase tables */
export interface Course {
  id: string;
  name: string;
  position: number;
  level: 'BASICA' | 'MEDIA';
  created_at: string;
}

export interface Student {
  id: string;
  full_name: string;
  course_id: string;
  rut: string;
  created_at: string;
}

// ====================================================
// EXISTING: Courses & Students (unchanged)
// ====================================================

/**
 * Fetch all courses ordered by position
 */
export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching courses:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch students for a specific course, ordered by full_name
 */
export async function fetchStudentsByCourse(courseId: string): Promise<Student[]> {
  if (!courseId) return [];

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('course_id', courseId)
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }

  return data || [];
}

/**
 * Search students by name (across all courses)
 */
export async function searchStudents(query: string): Promise<Student[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .ilike('full_name', `%${query}%`)
    .order('full_name', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Error searching students:', error);
    return [];
  }

  return data || [];
}

// ====================================================
// NEW: Causas (cases) CRUD operations
// ====================================================

/**
 * Fetch all causas, ordered by last update (most recent first)
 */
export async function fetchCausas(): Promise<Causa[]> {
  const { data: causasData, error: causasError } = await supabase
    .from('causas')
    .select('*')
    .order('fecha_ultima_actualizacion', { ascending: false });

  if (causasError || !causasData) {
    console.error('Error fetching causas:', causasError);
    return [];
  }

  // Map DB columns to frontend types
  const causas: Causa[] = await Promise.all(causasData.map(async (row: any) => {
    // Fetch related bitacora entries
    const { data: bitacoraData } = await supabase
      .from('bitacora_entries')
      .select('*')
      .eq('causa_id', row.id)
      .order('fecha', { ascending: false });

    // Fetch related checklist items
    const { data: checklistData } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('causa_id', row.id);

    const bitacora: BitacoraEntry[] = (bitacoraData || []).map((b: any) => ({
      id: b.id,
      fecha: b.fecha,
      tipo: b.tipo,
      titulo: b.titulo,
      descripcion: b.descripcion,
      participantes: b.participantes || [],
      documentoAdjunto: b.documento_adjunto || undefined
    }));

    const checklist: ChecklistItem[] = (checklistData || []).map((c: any) => ({
      id: c.id,
      label: c.label,
      descripcion: c.descripcion,
      completado: c.completado,
      fechaCompletado: c.fecha_completado || undefined,
      requeridoPor: c.requerido_por,
      registradoPor: c.registrado_por || undefined,
      observaciones: c.observaciones || undefined,
      documentoNombre: c.documento_nombre || undefined,
      documentoUrl: c.documento_url || undefined
    }));

    return {
      id: row.id,
      estudianteNombre: row.estudiante_nombre,
      estudianteCurso: row.estudiante_curso,
      nnaProtectedName: row.nna_protected_name,
      runEstudiante: row.run_estudiante,
      fechaApertura: row.fecha_apertura,
      estadoActual: row.estado_actual,
      tipoInfraccion: row.tipo_infraccion,
      responsable: row.responsable,
      comprometeAulaSegura: row.compromete_aula_segura,
      fechaUltimaActualizacion: row.fecha_ultima_actualizacion,
      observaciones: row.observaciones || '',
      conductaRiceId: row.conducta_rice_id || undefined,
      medidasEjecutadas: row.medidas_ejecutadas || [],
      bitacora,
      checklistDebidoProceso: checklist
    };
  }));

  return causas;
}

/**
 * Create a new causa with its initial bitacora entry
 */
export async function createCausa(causa: Causa): Promise<boolean> {
  // 1. Insert the causa
  const { error: causaError } = await supabase
    .from('causas')
    .insert({
      id: causa.id,
      estudiante_nombre: causa.estudianteNombre,
      estudiante_curso: causa.estudianteCurso,
      nna_protected_name: causa.nnaProtectedName,
      run_estudiante: causa.runEstudiante,
      fecha_apertura: causa.fechaApertura,
      estado_actual: causa.estadoActual,
      tipo_infraccion: causa.tipoInfraccion,
      responsable: causa.responsable,
      compromete_aula_segura: causa.comprometeAulaSegura,
      fecha_ultima_actualizacion: causa.fechaUltimaActualizacion,
      observaciones: causa.observaciones,
      conducta_rice_id: causa.conductaRiceId || null,
      medidas_ejecutadas: causa.medidasEjecutadas || []
    });

  if (causaError) {
    console.error('Error creating causa:', causaError);
    return false;
  }

  // 2. Insert initial bitacora entry if exists
  if (causa.bitacora && causa.bitacora.length > 0) {
    const { error: bitacoraError } = await supabase
      .from('bitacora_entries')
      .insert(causa.bitacora.map(b => ({
        id: b.id,
        causa_id: causa.id,
        fecha: b.fecha,
        tipo: b.tipo,
        titulo: b.titulo,
        descripcion: b.descripcion,
        participantes: b.participantes || [],
        documento_adjunto: b.documentoAdjunto || null
      })));

    if (bitacoraError) {
      console.error('Error creating bitacora entries:', bitacoraError);
    }
  }

  // 3. Insert checklist items
  if (causa.checklistDebidoProceso && causa.checklistDebidoProceso.length > 0) {
    const { error: checklistError } = await supabase
      .from('checklist_items')
      .insert(causa.checklistDebidoProceso.map(c => ({
        id: c.id,
        causa_id: causa.id,
        label: c.label,
        descripcion: c.descripcion,
        completado: c.completado,
        fecha_completado: c.fechaCompletado || null,
        requerido_por: c.requeridoPor,
        registrado_por: c.registradoPor || null,
        observaciones: c.observaciones || null,
        documento_nombre: c.documentoNombre || null,
        documento_url: c.documentoUrl || null
      })));

    if (checklistError) {
      console.error('Error creating checklist items:', checklistError);
    }
  }

  return true;
}

/**
 * Update an existing causa (main fields only)
 */
export async function updateCausa(causa: Causa): Promise<boolean> {
  const { error } = await supabase
    .from('causas')
    .update({
      estudiante_nombre: causa.estudianteNombre,
      estudiante_curso: causa.estudianteCurso,
      nna_protected_name: causa.nnaProtectedName,
      run_estudiante: causa.runEstudiante,
      fecha_apertura: causa.fechaApertura,
      estado_actual: causa.estadoActual,
      tipo_infraccion: causa.tipoInfraccion,
      responsable: causa.responsable,
      compromete_aula_segura: causa.comprometeAulaSegura,
      fecha_ultima_actualizacion: causa.fechaUltimaActualizacion,
      observaciones: causa.observaciones,
      conducta_rice_id: causa.conductaRiceId || null,
      medidas_ejecutadas: causa.medidasEjecutadas || []
    })
    .eq('id', causa.id);

  if (error) {
    console.error('Error updating causa:', error);
    return false;
  }

  return true;
}

/**
 * Save bitacora entries for a causa (replaces all existing)
 */
export async function saveBitacora(causaId: string, entries: BitacoraEntry[]): Promise<boolean> {
  // Delete existing entries
  const { error: deleteError } = await supabase
    .from('bitacora_entries')
    .delete()
    .eq('causa_id', causaId);

  if (deleteError) {
    console.error('Error deleting old bitacora entries:', deleteError);
    return false;
  }

  if (entries.length === 0) return true;

  // Insert new entries
  const { error: insertError } = await supabase
    .from('bitacora_entries')
    .insert(entries.map(b => ({
      id: b.id,
      causa_id: causaId,
      fecha: b.fecha,
      tipo: b.tipo,
      titulo: b.titulo,
      descripcion: b.descripcion,
      participantes: b.participantes || [],
      documento_adjunto: b.documentoAdjunto || null
    })));

  if (insertError) {
    console.error('Error inserting bitacora entries:', insertError);
    return false;
  }

  return true;
}

/**
 * Save checklist items for a causa (replaces all existing)
 */
export async function saveChecklist(causaId: string, items: ChecklistItem[]): Promise<boolean> {
  // Delete existing items
  const { error: deleteError } = await supabase
    .from('checklist_items')
    .delete()
    .eq('causa_id', causaId);

  if (deleteError) {
    console.error('Error deleting old checklist items:', deleteError);
    return false;
  }

  if (items.length === 0) return true;

  // Insert new items
  const { error: insertError } = await supabase
    .from('checklist_items')
    .insert(items.map(c => ({
      id: c.id,
      causa_id: causaId,
      label: c.label,
      descripcion: c.descripcion,
      completado: c.completado,
      fecha_completado: c.fechaCompletado || null,
      requerido_por: c.requeridoPor,
      registrado_por: c.registradoPor || null,
      observaciones: c.observaciones || null,
      documento_nombre: c.documentoNombre || null,
      documento_url: c.documentoUrl || null
    })));

  if (insertError) {
    console.error('Error inserting checklist items:', insertError);
    return false;
  }

  return true;
}

/**
 * Delete a causa and all related data (cascade should handle it, but explicit is safer)
 */
export async function deleteCausa(causaId: string): Promise<boolean> {
  // Delete related data first (in case cascade isn't set properly)
  await supabase.from('bitacora_entries').delete().eq('causa_id', causaId);
  await supabase.from('checklist_items').delete().eq('causa_id', causaId);

  // Delete the causa
  const { error } = await supabase
    .from('causas')
    .delete()
    .eq('id', causaId);

  if (error) {
    console.error('Error deleting causa:', error);
    return false;
  }

  return true;
}

// ====================================================
// Storage operations for document uploads
// ====================================================

const STORAGE_BUCKET = 'documentos_convivencia';

/**
 * Upload a document file to Supabase Storage
 * Returns the public URL or null on failure
 */
export async function uploadDocument(
  causaId: string,
  file: File,
  prefix: string = 'documentos'
): Promise<string | null> {
  const filePath = `${causaId}/${prefix}/${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading document:', error);
    return null;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData?.publicUrl || null;
}

/**
 * List all documents for a causa
 */
export async function listDocuments(causaId: string): Promise<{ name: string; url: string }[]> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(`${causaId}/`);

  if (error || !data) {
    console.error('Error listing documents:', error);
    return [];
  }

  return data.map(item => {
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(`${causaId}/${item.name}`);
    
    return {
      name: item.name,
      url: publicUrlData?.publicUrl || ''
    };
  });
}

/**
 * Delete a document from storage
 */
export async function deleteDocument(path: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) {
    console.error('Error deleting document:', error);
    return false;
  }

  return true;
}

// ====================================================
// Utility: Seed initial data from mock to Supabase
// ====================================================

/**
 * Seed the database with initial mock data (for first-time setup)
 */
export async function seedInitialData(causas: Causa[]): Promise<boolean> {
  // Check if data already exists
  const { count } = await supabase
    .from('causas')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    console.log('Data already seeded, skipping.');
    return true;
  }

  console.log(`Seeding ${causas.length} causas...`);

  for (const causa of causas) {
    const success = await createCausa(causa);
    if (!success) {
      console.error(`Failed to seed causa ${causa.id}`);
    }
  }

  return true;
}

/**
 * Clear all data from the database (causas, bitacora_entries, checklist_items)
 */
export async function clearAllData(): Promise<boolean> {
  console.log('Clearing all data from database...');
  
  const { error: deleteBitacora } = await supabase
    .from('bitacora_entries')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (deleteBitacora) {
    console.error('Error clearing bitacora_entries:', deleteBitacora);
  }

  const { error: deleteChecklist } = await supabase
    .from('checklist_items')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (deleteChecklist) {
    console.error('Error clearing checklist_items:', deleteChecklist);
  }

  const { error: deleteCausas } = await supabase
    .from('causas')
    .delete()
    .neq('id', ''); // delete all

  if (deleteCausas) {
    console.error('Error clearing causas:', deleteCausas);
    return false;
  }

  console.log('All data cleared successfully.');
  return true;
}
