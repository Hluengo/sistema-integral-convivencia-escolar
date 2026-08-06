/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Causa } from '../../lib/types';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

/** Cadena encadenable para mockear `supabase.from(...)` en tests. */
class MockQueryBuilder<T> {
  table: string;
  result: { data: T | null; error: Error | null };

  constructor(table: string, result: { data: T | null; error: Error | null }) {
    this.table = table;
    this.result = result;
  }

  select(_columns?: string) {
    return this;
  }
  eq(_column: string, _value: unknown) {
    return this;
  }
  order(_column: string, _opts?: { ascending?: boolean }) {
    return this;
  }
  range(_from: number, _to: number) {
    return this;
  }
  limit(_n: number) {
    return this;
  }
  maybeSingle() {
    return this.result;
  }
  single() {
    return this.result;
  }
  insert(_row: Record<string, unknown>) {
    return this;
  }
  update(_row: Record<string, unknown>) {
    return this;
  }
  delete() {
    return this;
  }
  async then(
    onFulfilled?: (value: { data: T | null; error: Error | null }) => unknown,
  ): Promise<unknown> {
    return onFulfilled ? onFulfilled(this.result) : this.result;
  }
}

interface MutableSupabase {
  from: (table: string) => MockQueryBuilder<unknown>;
}

interface CausasMockOptions {
  resultForTable: (table: string) => { data: unknown; error: Error | null };
  tenantId?: string | null;
}

async function withCausasMocks(
  options: CausasMockOptions,
  fn: () => Promise<unknown>,
): Promise<unknown> {
  const [{ supabase }, { useAuthStore }] = await Promise.all([
    import('../lib/supabase'),
    import('../../lib/stores/authStore'),
  ]);
  const mutable = supabase as unknown as MutableSupabase;
  const originalFrom = mutable.from;
  const originalConsoleError = console.error;
  const originalTenantId = useAuthStore.getState().tenantId;

  mutable.from = (table) =>
    new MockQueryBuilder(
      table,
      (options.resultForTable ?? (() => ({ data: null, error: null })))(table) as never,
    );
  console.error = () => undefined;
  useAuthStore.setState({
    tenantId: options.tenantId === undefined ? 'tenant-1' : options.tenantId,
  });

  try {
    return await fn();
  } finally {
    mutable.from = originalFrom;
    console.error = originalConsoleError;
    useAuthStore.setState({ tenantId: originalTenantId });
  }
}

function makeCausaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'DC-2026-001',
    estudiante_nombre: 'Estudiante',
    estudiante_curso: '8° Básico A',
    nna_protected_name: 'E.P.',
    run_estudiante: '23.456.789-K',
    fecha_apertura: '2026-08-01',
    estado_actual: 'Recepción de Denuncia',
    tipo_infraccion: 'Leve',
    responsable: 'Inspectoría',
    compromete_aula_segura: false,
    fecha_ultima_actualizacion: '2026-08-01',
    observaciones: '',
    conducta_rice_id: null,
    medidas_ejecutadas: [],
    ...overrides,
  };
}

function makeChecklistRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chk_rec_1',
    causa_id: 'DC-2026-001',
    label: 'Recepción de Denuncia',
    descripcion: 'Se recibe formalmente el reporte.',
    completado: true,
    fecha_completado: '2026-08-01',
    requerido_por: 'Circular 482',
    registrado_por: 'user-1',
    observaciones: null,
    documento_nombre: null,
    documento_url: null,
    ...overrides,
  };
}

function makeBitacoraRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b-1',
    causa_id: 'DC-2026-001',
    fecha: '2026-08-01',
    tipo: 'Entrevista',
    titulo: 'Entrevista inicial',
    descripcion: 'Se recoge la versión del estudiante.',
    participantes: ['user-1'],
    documento_adjunto: null,
    ...overrides,
  };
}

describe('fetchCausasPage', () => {
  it('mapea filas y no indica siguiente página cuando no sobran', async () => {
    const result = await withCausasMocks(
      {
        resultForTable: () => ({ data: [makeCausaRow()], error: null }),
      },
      async () => {
        const { fetchCausasPage } = await import('./causas.service');
        return fetchCausasPage(0, 50);
      },
    );
    const page = result as { causas: Causa[]; nextOffset?: number };
    assert.equal(page.causas.length, 1);
    assert.equal(page.causas[0].id, 'DC-2026-001');
    assert.equal(page.causas[0].estudianteNombre, 'Estudiante');
    assert.equal(page.nextOffset, undefined);
  });

  it('indica siguiente página cuando la consulta devuelve más de lo pedido', async () => {
    const result = await withCausasMocks(
      {
        resultForTable: () => ({
          data: [makeCausaRow({ id: 'DC-2026-001' }), makeCausaRow({ id: 'DC-2026-002' })],
          error: null,
        }),
      },
      async () => {
        const { fetchCausasPage } = await import('./causas.service');
        return fetchCausasPage(0, 1);
      },
    );
    const page = result as { causas: Causa[]; nextOffset?: number };
    assert.equal(page.causas.length, 1);
    assert.equal(page.nextOffset, 1);
  });

  it('propaga el error de lectura', async () => {
    await assert.rejects(
      withCausasMocks(
        { resultForTable: () => ({ data: null, error: new Error('db down') }) },
        async () => {
          const { fetchCausasPage } = await import('./causas.service');
          return fetchCausasPage();
        },
      ),
      /db down/,
    );
  });

  it('lanza error genérico cuando no hay datos ni error', async () => {
    await assert.rejects(
      withCausasMocks({ resultForTable: () => ({ data: null, error: null }) }, async () => {
        const { fetchCausasPage } = await import('./causas.service');
        return fetchCausasPage();
      }),
      /No se recibieron causas/,
    );
  });
});

describe('fetchCausaDetails', () => {
  it('ensambla causa con checklist y bitácora reconciliados', async () => {
    const result = await withCausasMocks(
      {
        resultForTable: (table) => {
          if (table === 'causas') return { data: makeCausaRow(), error: null };
          if (table === 'checklist_items') return { data: [makeChecklistRow()], error: null };
          if (table === 'bitacora_entries') return { data: [makeBitacoraRow()], error: null };
          return { data: null, error: null };
        },
      },
      async () => {
        const { fetchCausaDetails } = await import('./causas.service');
        return fetchCausaDetails('DC-2026-001');
      },
    );
    const causa = result as Causa;
    assert.equal(causa.id, 'DC-2026-001');
    // La reconciliación expande la checklist base completa y aplica lo persistido
    assert.ok(causa.checklistDebidoProceso.length > 0);
    const recepcion = causa.checklistDebidoProceso.find((c) => c.id === 'chk_rec_1');
    assert.ok(recepcion, 'chk_rec_1 debe existir en la checklist reconciliada');
    assert.equal(recepcion.completado, true);
    assert.equal(recepcion.requeridoPor, 'Circular 482');
    assert.equal(causa.bitacora.length, 1);
  });

  it('lanza error cuando la causa no existe', async () => {
    await assert.rejects(
      withCausasMocks(
        {
          resultForTable: () => ({ data: null, error: null }),
        },
        async () => {
          const { fetchCausaDetails } = await import('./causas.service');
          return fetchCausaDetails('DC-9999');
        },
      ),
      /No se encontró el expediente/,
    );
  });

  it('propaga el error de lectura de la causa', async () => {
    await assert.rejects(
      withCausasMocks(
        {
          resultForTable: (table) =>
            table === 'causas'
              ? { data: null, error: new Error('boom') }
              : { data: [], error: null },
        },
        async () => {
          const { fetchCausaDetails } = await import('./causas.service');
          return fetchCausaDetails('DC-2026-001');
        },
      ),
      /boom/,
    );
  });
});

describe('createCausa', () => {
  it('inserta la causa y devuelve el id resuelto', async () => {
    const result = await withCausasMocks(
      {
        resultForTable: (table) => {
          if (table === 'causas') return { data: null, error: null };
          return { data: null, error: null };
        },
      },
      async () => {
        const { createCausa } = await import('./causas.service');
        const causa = {
          ...(makeCausaRow() as unknown as Causa),
          estadoActual: 'Recepción de Denuncia' as Causa['estadoActual'],
        };
        return createCausa(causa);
      },
    );
    assert.equal(result, 'DC-2026-001');
  });

  it('genera id correlativo cuando el preferido ya existe', async () => {
    const result = await withCausasMocks(
      {
        resultForTable: (table) => {
          if (table === 'causas') {
            // La primera consulta (maybeSingle) devuelve el id preferido ocupado,
            // la segunda (todos los id) permite calcular el correlativo.
            return { data: [{ id: 'DC-2026-003' }], error: null };
          }
          return { data: null, error: null };
        },
      },
      async () => {
        const { createCausa } = await import('./causas.service');
        const causa = {
          ...(makeCausaRow({ id: 'DC-2026-003' }) as unknown as Causa),
          estadoActual: 'Recepción de Denuncia' as Causa['estadoActual'],
        };
        return createCausa(causa);
      },
    );
    assert.equal(result, `DC-${new Date().getFullYear()}-004`);
  });

  it('retorna false cuando falla la inserción', async () => {
    const result = await withCausasMocks(
      {
        resultForTable: (table) => {
          if (table === 'causas') {
            // maybeSingle retorna null (libre) y la inserción falla con error.
            return { data: null, error: new Error('insert denied') };
          }
          return { data: null, error: null };
        },
      },
      async () => {
        const { createCausa } = await import('./causas.service');
        const causa = {
          ...(makeCausaRow() as unknown as Causa),
          estadoActual: 'Recepción de Denuncia' as Causa['estadoActual'],
        };
        return createCausa(causa);
      },
    );
    assert.equal(result, false);
  });
});

describe('updateCausa', () => {
  it('retorna true cuando la fila se actualiza', async () => {
    const result = await withCausasMocks(
      {
        resultForTable: () => ({ data: [{ id: 'DC-2026-001' }], error: null }),
      },
      async () => {
        const { updateCausa } = await import('./causas.service');
        const causa = {
          ...(makeCausaRow() as unknown as Causa),
          estadoActual: 'Recepción de Denuncia' as Causa['estadoActual'],
        };
        return updateCausa(causa);
      },
    );
    assert.equal(result, true);
  });

  it('retorna false cuando no hay filas afectadas', async () => {
    const result = await withCausasMocks(
      {
        resultForTable: () => ({ data: [], error: null }),
      },
      async () => {
        const { updateCausa } = await import('./causas.service');
        const causa = {
          ...(makeCausaRow() as unknown as Causa),
          estadoActual: 'Recepción de Denuncia' as Causa['estadoActual'],
        };
        return updateCausa(causa);
      },
    );
    assert.equal(result, false);
  });
});

describe('deleteCausa', () => {
  it('elimina bitácora, checklist y causa, retornando true', async () => {
    const result = await withCausasMocks(
      {
        resultForTable: () => ({ data: null, error: null }),
      },
      async () => {
        const { deleteCausa } = await import('./causas.service');
        return deleteCausa('DC-2026-001');
      },
    );
    assert.equal(result, true);
  });

  it('retorna false cuando falla la eliminación de la causa', async () => {
    const result = await withCausasMocks(
      {
        resultForTable: () => ({ data: null, error: new Error('delete denied') }),
      },
      async () => {
        const { deleteCausa } = await import('./causas.service');
        return deleteCausa('DC-2026-001');
      },
    );
    assert.equal(result, false);
  });
});
