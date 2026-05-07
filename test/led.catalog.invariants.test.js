import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveLedSpectralSeriesId } from "../src/catalog/ledCatalog";
import { LED_LIBRARY_V2 } from "../src/domain/led/ledDefinitions";
import { LED_CURVES, LUMINOUS_FLUX_BINS_LM } from "../src/domain/led/ledCurves";
import { listSeriesIds } from "../src/domain/spectral/seriesLibrary";

test("LED catalog invariant: ids, required metadata, and curve sets resolve", () => {
  const entries = Object.entries(LED_LIBRARY_V2);
  const ids = entries.map(([_key, led]) => led.id);

  assert.equal(new Set(ids).size, ids.length);
  for (const [key, led] of entries) {
    assert.equal(led.id, key);
    assert.ok(led.name, `${key} is missing name`);
    assert.ok(led.family, `${key} is missing family`);
    assert.ok(led.curveSetId, `${key} is missing curveSetId`);
    assert.ok(LED_CURVES[led.curveSetId], `${key} has unknown curve set`);
    assert.ok(led.reference, `${key} is missing reference`);
    assert.ok(
      Array.isArray(led.sourceDocuments) && led.sourceDocuments.length > 0,
      `${key} is missing sourceDocuments`,
    );
  }
});

test("LED catalog invariant: luminous flux bin codes resolve", () => {
  for (const led of Object.values(LED_LIBRARY_V2)) {
    for (const code of led.luminousFluxBinCodes ?? []) {
      assert.ok(
        LUMINOUS_FLUX_BINS_LM[code],
        `${led.id} references unknown luminous flux bin ${code}`,
      );
      assert.ok(
        led.luminousFluxBinsLm?.[code],
        `${led.id} does not expose luminous flux bin ${code}`,
      );
    }
  }
});

test("LED catalog invariant: spectral series ids resolve", () => {
  const seriesIds = new Set(listSeriesIds());

  for (const led of Object.values(LED_LIBRARY_V2)) {
    const spectralSeriesId = resolveLedSpectralSeriesId(led);
    assert.ok(spectralSeriesId, `${led.id} has no spectral series id`);
    assert.ok(
      seriesIds.has(spectralSeriesId),
      `${led.id} references unknown spectral series ${spectralSeriesId}`,
    );
  }
});

test("LED catalog invariant: PDF source documents exist", () => {
  for (const led of Object.values(LED_LIBRARY_V2)) {
    for (const sourceDocument of led.sourceDocuments) {
      if (!sourceDocument.endsWith(".pdf")) continue;
      const documentPath = fileURLToPath(
        new URL(`../pdf/${sourceDocument}`, import.meta.url),
      );
      assert.equal(
        existsSync(documentPath),
        true,
        `${led.id} references missing source document ${sourceDocument}`,
      );
    }
  }
});
