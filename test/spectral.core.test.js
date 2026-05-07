import test from "node:test";
import assert from "node:assert/strict";
import {
  clearSpectralCoreCaches,
  resolveLedDisplaySpectrum,
  resolvePhotonKernel,
} from "../src/application/spectral/spectralCore";

test("resolveLedDisplaySpectrum resolves relative and photon spectra", () => {
  clearSpectralCoreCaches();
  const relative = resolveLedDisplaySpectrum({
    ledId: "lm301h_cri80_5000k",
    mode: "relative",
    stepNm: 1,
    nmMin: 280,
    nmMax: 840,
  });
  const photon = resolveLedDisplaySpectrum({
    ledId: "lm301h_cri80_5000k",
    mode: "photon",
    stepNm: 1,
    nmMin: 280,
    nmMax: 840,
  });

  assert.equal(relative.ok, true);
  assert.equal(photon.ok, true);
  assert.equal(relative.data.wavelengthNm.length, 561);
  assert.equal(photon.data.values.length, 561);
});

test("resolvePhotonKernel resolves a cached 1 µmol/s kernel", () => {
  clearSpectralCoreCaches();
  const kernelResult = resolvePhotonKernel({
    ledId: "lm301h_cri80_5000k",
    nmMin: 280,
    nmMax: 840,
  });
  assert.equal(kernelResult.ok, true);
  assert.equal(kernelResult.data.values.length, 561);
});
