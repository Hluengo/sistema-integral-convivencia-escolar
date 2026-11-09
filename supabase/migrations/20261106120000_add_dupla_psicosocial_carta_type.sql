/** @license SPDX-License-Identifier: Apache-2.0 */

ALTER TABLE public.cartas_disciplinarias
  DROP CONSTRAINT IF EXISTS cartas_disciplinarias_letter_type_check;

ALTER TABLE public.cartas_disciplinarias
  ADD CONSTRAINT cartas_disciplinarias_letter_type_check
  CHECK (letter_type IN (
    'Amonestación Escrita',
    'Carta de Compromiso Conductual',
    'Compromiso Conductual - Derivación a Dupla Psicosocial',
    'Ficha de Derivación'
  ));
