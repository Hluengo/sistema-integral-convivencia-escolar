-- Ambos índices fueron verificados como idénticos en producción:
-- (tenant_id, fecha_ultima_actualizacion DESC).
-- Esta migración no debe aplicarse manualmente fuera del flujo normal de
-- migraciones; mantiene el índice idx_causas_tenant_fecha, usado por el
-- listado paginado de expedientes.
DROP INDEX IF EXISTS public.idx_causas_tenant_updated;
