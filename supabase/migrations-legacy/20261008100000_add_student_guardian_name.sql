-- @license SPDX-License-Identifier: Apache-2.0

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS apoderado_nombre TEXT;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS apoderado_actualizado_at TIMESTAMPTZ;

COMMENT ON COLUMN public.students.apoderado_nombre IS
  'Nombre del apoderado titular usado como valor predeterminado editable.';
