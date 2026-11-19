/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDocumentPreviewKind } from "./documentPreviewText";

describe("getDocumentPreviewKind", () => {
  it("reconoce pdf con y sin parametros de la URL firmada", () => {
    assert.equal(
      getDocumentPreviewKind("causa/documentos/1_informe.pdf"),
      "pdf",
    );
    assert.equal(
      getDocumentPreviewKind(
        "https://x.supabase.co/storage/v1/object/sign/b/1.pdf?token=abc",
      ),
      "pdf",
    );
  });

  it("reconoce docx, txt y md sin distinguir mayusculas", () => {
    assert.equal(getDocumentPreviewKind("1_Informe.DOCX"), "docx");
    assert.equal(getDocumentPreviewKind("1_nota.txt"), "text");
    assert.equal(getDocumentPreviewKind("1_nota.md"), "text");
  });

  it("deja sin vista previa los formatos que no puede dibujar", () => {
    assert.equal(getDocumentPreviewKind("1_acta.doc"), "none");
    assert.equal(getDocumentPreviewKind("1_foto.jpg"), "none");
    assert.equal(getDocumentPreviewKind(undefined), "none");
    assert.equal(getDocumentPreviewKind(""), "none");
  });
});
