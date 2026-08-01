-- @license SPDX-License-Identifier: Apache-2.0

ALTER TABLE public.cartas_disciplinarias
ADD COLUMN IF NOT EXISTS content_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_cartas_disciplinarias_content_snapshot_gin
ON public.cartas_disciplinarias USING GIN (content_snapshot);
