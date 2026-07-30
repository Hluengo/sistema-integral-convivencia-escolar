/** @license SPDX-License-Identifier: Apache-2.0 */

// Re-export the canonical auth middleware so server/api and server/index.ts
// share a single source of truth. The canonical implementation lives in
// server/middleware/auth.ts and is bundled into api/index.js by esbuild.
export { requireAuth } from '../../middleware/auth.js';
