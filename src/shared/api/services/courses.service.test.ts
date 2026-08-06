/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Course, Student, StudentWithCourse } from './courses.service';

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
  async then(
    onFulfilled?: (value: { data: T | null; error: Error | null }) => unknown,
  ): Promise<unknown> {
    return onFulfilled ? onFulfilled(this.result) : this.result;
  }
}

interface MutableSupabase {
  from: (table: string) => MockQueryBuilder<unknown>;
}

async function withFromMock(
  resultForTable: (table: string) => { data: unknown; error: Error | null },
  fn: () => Promise<unknown>,
): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as MutableSupabase;
  const originalFrom = mutable.from;
  const originalConsoleError = console.error;
  mutable.from = (table) => new MockQueryBuilder(table, resultForTable(table) as never);
  console.error = () => undefined;
  try {
    return await fn();
  } finally {
    mutable.from = originalFrom;
    console.error = originalConsoleError;
  }
}

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'c-1',
    name: '8° Básico A',
    position: 1,
    level: 'BASICA',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: 's-1',
    full_name: 'Estudiante',
    course_id: 'c-1',
    rut: '23.456.789-K',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('fetchCourses', () => {
  it('retorna los cursos ordenados', async () => {
    const result = await withFromMock(
      () => ({
        data: [makeCourse(), makeCourse({ id: 'c-2', name: '1° Medio A', level: 'MEDIA' })],
        error: null,
      }),
      async () => {
        const { fetchCourses } = await import('./courses.service');
        return fetchCourses();
      },
    );
    const courses = result as Course[];
    assert.equal(courses.length, 2);
    assert.equal(courses[1].level, 'MEDIA');
  });

  it('retorna vacío cuando hay error', async () => {
    const result = await withFromMock(
      () => ({ data: null, error: new Error('boom') }),
      async () => {
        const { fetchCourses } = await import('./courses.service');
        return fetchCourses();
      },
    );
    assert.deepEqual(result, []);
  });
});

describe('fetchStudentsByCourse', () => {
  it('retorna vacío sin courseId', async () => {
    const result = await withFromMock(
      () => ({ data: [makeStudent()], error: null }),
      async () => {
        const { fetchStudentsByCourse } = await import('./courses.service');
        return fetchStudentsByCourse('');
      },
    );
    assert.deepEqual(result, []);
  });

  it('retorna estudiantes del curso', async () => {
    const result = await withFromMock(
      () => ({ data: [makeStudent()], error: null }),
      async () => {
        const { fetchStudentsByCourse } = await import('./courses.service');
        return fetchStudentsByCourse('c-1');
      },
    );
    const students = result as Student[];
    assert.equal(students[0].full_name, 'Estudiante');
    assert.equal(students[0].course_id, 'c-1');
  });

  it('retorna vacío cuando hay error', async () => {
    const result = await withFromMock(
      () => ({ data: null, error: new Error('boom') }),
      async () => {
        const { fetchStudentsByCourse } = await import('./courses.service');
        return fetchStudentsByCourse('c-1');
      },
    );
    assert.deepEqual(result, []);
  });
});

describe('fetchStudentsWithCourses', () => {
  it('une estudiantes con el nombre del curso', async () => {
    const result = await withFromMock(
      () => ({
        data: [
          { ...makeStudent(), courses: { name: '8° Básico A', level: 'BASICA' } },
          { ...makeStudent({ id: 's-2' }), courses: null },
        ],
        error: null,
      }),
      async () => {
        const { fetchStudentsWithCourses } = await import('./courses.service');
        return fetchStudentsWithCourses();
      },
    );
    const students = result as StudentWithCourse[];
    assert.equal(students.length, 2);
    assert.equal(students[0].course_name, '8° Básico A');
    assert.equal(students[0].course_level, 'BASICA');
    // Sin curso → 'Sin curso' y level null
    assert.equal(students[1].course_name, 'Sin curso');
    assert.equal(students[1].course_level, null);
  });

  it('retorna vacío cuando hay error', async () => {
    const result = await withFromMock(
      () => ({ data: null, error: new Error('boom') }),
      async () => {
        const { fetchStudentsWithCourses } = await import('./courses.service');
        return fetchStudentsWithCourses();
      },
    );
    assert.deepEqual(result, []);
  });
});
