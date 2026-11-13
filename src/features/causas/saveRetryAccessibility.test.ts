/** @license SPDX-License-Identifier: Apache-2.0 */

import { ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const featureDir = import.meta.dirname!;
const source = (relativePath: string) =>
  readFileSync(resolve(featureDir, relativePath), "utf-8");
const sharedSource = (relativePath: string) =>
  readFileSync(resolve(featureDir, "../../shared", relativePath), "utf-8");

describe("Reintento de sincronización ante error de guardado", () => {
  it("el hook re-encola lo fallido y reacciona al nonce de reintento", () => {
    const content = sharedSource("lib/hooks/useCausasPersistence.ts");

    ok(content.includes("saveRetryNonce"));
    ok(content.includes("runPendingSaves"));
    ok(content.includes("requeueFailedSaves(pendingSaves)"));
    ok(content.includes("mergePendingCausaSave"));
  });

  it("el timeline obtiene estado y reintento del contexto compartido", () => {
    const content = source("../timeline/InteractiveTimeline.tsx");
    const context = sharedSource("lib/useAppContext.ts");

    ok(content.includes("saveStatus={saveStatus}"));
    ok(content.includes("onRetrySave={onRetrySave}"));
    ok(content.includes("ctx.saveStatus"));
    ok(content.includes("ctx.requestSaveRetry"));
    ok(context.includes("requestSaveRetry"));
  });
});
