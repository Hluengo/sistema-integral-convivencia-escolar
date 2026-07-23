-- ============================================================
-- Migration: corregir reglas disciplinarias y derivaciones
-- ============================================================

-- La vista de documentos ofrece derivación como salida posterior al compromiso.
ALTER TABLE cartas_disciplinarias
  DROP CONSTRAINT IF EXISTS cartas_disciplinarias_letter_type_check;

ALTER TABLE cartas_disciplinarias
  ADD CONSTRAINT cartas_disciplinarias_letter_type_check
  CHECK (letter_type IN (
    'Amonestación Escrita',
    'Carta de Compromiso Conductual',
    'Ficha de Derivación'
  ));

-- Normaliza nombres visibles de reglas sin cambiar sus códigos funcionales.
UPDATE disciplinary_rules
SET rule_name = 'Amonestación Escrita',
    description = '5-9 negativas'
WHERE suggested_letter_type = 'amonestacion';

UPDATE disciplinary_rules
SET rule_name = 'Carta de Compromiso Conductual',
    description = '10-14 negativas'
WHERE suggested_letter_type IN ('compromiso', 'compromiso_conductual');

UPDATE disciplinary_rules
SET rule_name = 'Derivación a Convivencia Escolar',
    description = '15 o más negativas'
WHERE suggested_letter_type = 'derivacion';

-- Borra duplicados manteniendo la regla activa más prioritaria/reciente por umbral.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        tenant_id,
        rule_type,
        suggested_letter_type,
        COALESCE(min_negativas, -1),
        COALESCE(max_negativas, -1),
        COALESCE(min_positivas, -1),
        COALESCE(max_positivas, -1),
        COALESCE(min_informativas, -1),
        COALESCE(max_informativas, -1)
      ORDER BY is_active DESC, priority DESC, updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM disciplinary_rules
)
DELETE FROM disciplinary_rules dr
USING ranked r
WHERE dr.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_disciplinary_rules_unique_threshold
  ON disciplinary_rules (
    tenant_id,
    rule_type,
    suggested_letter_type,
    COALESCE(min_negativas, -1),
    COALESCE(max_negativas, -1),
    COALESCE(min_positivas, -1),
    COALESCE(max_positivas, -1),
    COALESCE(min_informativas, -1),
    COALESCE(max_informativas, -1)
  );

-- Asegura el set base para todos los tenants existentes, no sólo el primero.
INSERT INTO disciplinary_rules (
  rule_type,
  rule_name,
  description,
  min_negativas,
  max_negativas,
  suggested_letter_type,
  priority,
  tenant_id
)
SELECT defaults.rule_type,
       defaults.rule_name,
       defaults.description,
       defaults.min_negativas,
       defaults.max_negativas,
       defaults.suggested_letter_type,
       defaults.priority,
       tenants.id
FROM tenants
CROSS JOIN (
  VALUES
    ('letter_type', 'Sin carta', 'Menos de 5 negativas', 0, 4, 'none', 1),
    ('letter_type', 'Amonestación Escrita', '5-9 negativas', 5, 9, 'amonestacion', 2),
    ('letter_type', 'Carta de Compromiso Conductual', '10-14 negativas', 10, 14, 'compromiso', 3),
    ('letter_type', 'Derivación a Convivencia Escolar', '15 o más negativas', 15, NULL, 'derivacion', 4)
) AS defaults(rule_type, rule_name, description, min_negativas, max_negativas, suggested_letter_type, priority)
ON CONFLICT DO NOTHING;

SELECT pg_notify('pgrst', 'reload schema');