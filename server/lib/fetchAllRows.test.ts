/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchAllRows } from "./fetchAllRows.js";

describe("fetchAllRows", () => {
  it("pagina con range hasta que una página llega incompleta", async () => {
    const pages: Array<{ data: number[] | null; error: unknown }> = [
      { data: Array.from({ length: 1000 }, (_, i) => i), error: null },
      { data: [1000, 1001], error: null },
    ];
    const ranges: Array<[number, number]> = [];

    const rows = await fetchAllRows<number>((from, to) => {
      ranges.push([from, to]);
      return Promise.resolve(pages[ranges.length - 1]);
    });

    assert.equal(rows.length, 1002);
    assert.deepEqual(ranges, [
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("propaga el error en vez de devolver datos parciales", async () => {
    await assert.rejects(
      fetchAllRows<number>(() =>
        Promise.resolve({ data: null, error: new Error("500") }),
      ),
      /500/,
    );
  });
});
