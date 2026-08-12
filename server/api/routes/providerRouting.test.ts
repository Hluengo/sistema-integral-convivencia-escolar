/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('AI provider routing', () => {
  it('usa OpenRouter solo para mejora de textos breves', () => {
    const improveRoute = source('server/api/routes/improve.ts');
    const openRouterService = source('server/api/services/openrouter.ts');

    assert.match(improveRoute, /services\/openrouter/);
    assert.doesNotMatch(improveRoute, /services\/gemini/);
    assert.match(openRouterService, /openrouter\/free/);
    assert.match(improveRoute, /generateFallbackImprovement/);
  });

  it('usa Gemini para borradores e informes oficiales', () => {
    const draftRoute = source('server/api/routes/draft.ts');
    const auditRoute = source('server/api/routes/audit.ts');

    assert.match(draftRoute, /services\/gemini/);
    assert.match(auditRoute, /services\/gemini/);
    assert.doesNotMatch(draftRoute, /callOpenRouterLegalDraft/);
    assert.doesNotMatch(auditRoute, /services\/openrouter/);
  });

  it('no mantiene respaldo OpenRouter para documentos legales complejos', () => {
    const openRouterService = source('server/api/services/openrouter.ts');

    assert.doesNotMatch(openRouterService, /LEGAL_DRAFT_OPENROUTER_MODEL/);
    assert.doesNotMatch(openRouterService, /callOpenRouterLegalDraft/);
  });
});
