/** @license SPDX-License-Identifier: Apache-2.0 */

// Re-export the canonical superadmin middleware so server/api routes
// share a single source of truth (patrón idéntico a requireRole/requireTenant).
export { requireSuperAdmin } from '../../middleware/requireSuperAdmin.js';
