/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCitacionEmailDomain,
  isSafeDocumentoHtml,
  isValidCitacionEmail,
} from "./notificaciones";

describe("validación de citaciones por correo", () => {
  it("rechaza esquemas ejecutables ofuscados con entidades y caracteres de control", () => {
    for (const html of [
      '<a href="java\nscript:alert(1)">abrir</a>',
      '<a href="&#x6a;avascript&#58;alert(1)">abrir</a>',
      '<iframe src="https://example.com"></iframe>',
      '<meta http-equiv="refresh" content="0;url=https://example.com">',
    ]) {
      assert.equal(isSafeDocumentoHtml(html), false);
    }
    assert.equal(
      isSafeDocumentoHtml(
        '<p>Texto con saltos\ny <a href="https://example.com">enlace seguro</a></p>',
      ),
      true,
    );
  });
  it("acepta correos válidos y rechaza inválidos", () => {
    assert.equal(isValidCitacionEmail("apoderado@colegio.cl"), true);
    assert.equal(isValidCitacionEmail(" no-es-correo "), false);
    assert.equal(isValidCitacionEmail(""), false);
    assert.equal(isValidCitacionEmail(undefined), false);
  });

  it("extrae el dominio en minúsculas para auditoría sin PII", () => {
    assert.equal(getCitacionEmailDomain("Apoderado@Colegio.CL"), "colegio.cl");
  });

  it("acepta HTML simple y rechaza scripts, iframes y handlers", () => {
    assert.equal(isSafeDocumentoHtml(" \n\t "), false);
    assert.equal(isSafeDocumentoHtml("<p>Hola <b>mundo</b></p>"), true);
    assert.equal(isSafeDocumentoHtml("<script>alert(1)</script>"), false);
    assert.equal(isSafeDocumentoHtml('<iframe src="x"></iframe>'), false);
    assert.equal(isSafeDocumentoHtml('<p onclick="x()">hola</p>'), false);
    assert.equal(
      isSafeDocumentoHtml('<a href="javascript:alert(1)">x</a>'),
      false,
    );
    assert.equal(
      isSafeDocumentoHtml('<iframe srcdoc="<script>x</script>"></iframe>'),
      false,
    );
    assert.equal(isSafeDocumentoHtml(""), false);
    assert.equal(isSafeDocumentoHtml("x".repeat(100_001)), false);
  });
});
