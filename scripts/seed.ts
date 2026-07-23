/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Seed script for the Debido Proceso Supabase database.
 *
 * Usage:
 *   npx tsx scripts/seed.ts --clear
 *   npx tsx scripts/seed.ts --demo
 *   npx tsx scripts/seed.ts --clear --demo
 */

import dotenv from 'dotenv';
import { supabase } from '../src/lib/supabase';
import { createCausa } from '../src/services/cases/causas.service';
import { createDraftCausa } from '../src/lib/causaFactory';
import type { Causa } from '../src/types';

dotenv.config({ path: '.env.local' });

async function clearAllData(): Promise<boolean> {
  console.log('Clearing all data from database...');

  const { error: deleteBitacora } = await supabase
    .from('bitacora_entries')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteBitacora) {
    console.error('Error clearing bitacora_entries:', deleteBitacora);
  }

  const { error: deleteChecklist } = await supabase
    .from('checklist_items')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteChecklist) {
    console.error('Error clearing checklist_items:', deleteChecklist);
  }

  const { error: deleteCausas } = await supabase.from('causas').delete().neq('id', '');

  if (deleteCausas) {
    console.error('Error clearing causas:', deleteCausas);
    return false;
  }

  console.log('All data cleared successfully.');
  return true;
}

async function seedInitialData(causas: Causa[]): Promise<boolean> {
  const { count } = await supabase.from('causas').select('id', { count: 'exact', head: true });

  if (count && count > 0) {
    console.log('Data already seeded, skipping.');
    return true;
  }

  console.log(`Seeding ${causas.length} causas...`);

  await Promise.all(
    causas.map(async (causa) => {
      const success = await createCausa(causa);
      if (!success) {
        console.error(`Failed to seed causa ${causa.id}`);
      }
    })
  );

  return true;
}

async function main() {
  const shouldClear = process.argv.includes('--clear');
  const demoOnly = process.argv.includes('--demo');

  if (shouldClear) {
    console.log('Clearing existing data...');
    await clearAllData();
  }

  const causasToSeed = demoOnly
    ? [
        createDraftCausa({
          counter: 1,
          estudianteNombre: 'María González Pérez',
          estudianteCurso: '5° Básico A',
          runEstudiante: '23.456.789-K',
          tipoInfraccion: 'Grave',
          comprometeAulaSegura: false,
          observaciones:
            'Incidente de conflicto verbal en patio durante recreo, con testimonio de pares y evidencia de mensajería.',
          responsable: 'Inspectoría General',
        }),
        createDraftCausa({
          counter: 2,
          estudianteNombre: 'Pedro Soto Rivas',
          estudianteCurso: '3° Medio B',
          runEstudiante: '26.789.123-4',
          tipoInfraccion: 'Muy Grave',
          comprometeAulaSegura: true,
          observaciones:
            'Porte de objeto contundente al interior del establecimiento. Medidas de resguardo inmediatas activadas.',
          responsable: 'Coordinación de Ciclo',
        }),
      ]
    : [];

  console.log(`Seeding ${causasToSeed.length} causas...`);
  const success = await seedInitialData(causasToSeed);

  if (success) {
    console.log('Seed finalizado correctamente.');
    if (demoOnly) {
      console.log('Datos de demostración insertados:');
      for (const c of causasToSeed) {
        console.log(`  - ${c.id} | ${c.estudianteNombre} | ${c.estadoActual}`);
      }
    }
  } else {
    console.error('Seed falló. Verifique la conexión con Supabase.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Error en seed:', error);
  process.exitCode = 1;
});
