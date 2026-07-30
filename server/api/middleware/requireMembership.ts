/** @license SPDX-License-Identifier: Apache-2.0 */

// Re-export the canonical membership middleware so server/api and server/index.ts
// share a single source of truth. The canonical implementation lives in
// server/middleware/requireMembership.ts and is bundled into api/index.js by esbuild.
export { requireMembership } from '../../middleware/requireMembership.js';
