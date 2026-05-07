import { LED_CURVES } from "@/domain/led/ledCurves";
import type {
  LedDefinition,
  LedReference,
  NumericCurvePoint,
} from "@/domain/contracts";

export function interpolateCurve(points: NumericCurvePoint[], x: number) {
  if (points.length === 0) throw new Error("Cannot interpolate empty curve.");
  if (points.length === 1) return points[0][1];
  if (x <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    if (x <= x1) {
      const [x0, y0] = points[index - 1];
      const t = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return points[points.length - 1][1];
}

export function interpolateInverseCurve(
  points: NumericCurvePoint[],
  y: number,
) {
  if (points.length === 0) throw new Error("Cannot interpolate empty curve.");
  if (points.length === 1) return points[0][0];
  if (y <= points[0][1]) return points[0][0];
  for (let index = 1; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    if (y <= y1) {
      const [x0, y0] = points[index - 1];
      const t = (y - y0) / (y1 - y0);
      return x0 + (x1 - x0) * t;
    }
  }
  return points[points.length - 1][0];
}

export function getDeratedMaxCurrentMA(
  led: LedDefinition,
  input: {
    ambientTempC: number;
    thermalResistanceJunctionToAmbientCW: number;
  },
) {
  const curves = [...led.deratingCurves.curves].sort(
    (a, b) =>
      a.thermalResistanceJunctionToAmbientCW -
      b.thermalResistanceJunctionToAmbientCW,
  );
  if (curves.length === 0) return led.absoluteMaximum.forwardCurrentMAMax;
  const rth = input.thermalResistanceJunctionToAmbientCW;
  let lower = curves[0];
  let upper = curves[curves.length - 1];
  if (rth <= curves[0].thermalResistanceJunctionToAmbientCW) {
    lower = curves[0];
    upper = curves[0];
  } else if (
    rth >= curves[curves.length - 1].thermalResistanceJunctionToAmbientCW
  ) {
    lower = curves[curves.length - 1];
    upper = curves[curves.length - 1];
  } else {
    for (let index = 1; index < curves.length; index += 1) {
      if (rth <= curves[index].thermalResistanceJunctionToAmbientCW) {
        lower = curves[index - 1];
        upper = curves[index];
        break;
      }
    }
  }
  const lowerCurrent = interpolateCurve(lower.points, input.ambientTempC);
  const upperCurrent = interpolateCurve(upper.points, input.ambientTempC);
  if (lower === upper) {
    return Math.min(led.absoluteMaximum.forwardCurrentMAMax, lowerCurrent);
  }
  const t =
    (rth - lower.thermalResistanceJunctionToAmbientCW) /
    (upper.thermalResistanceJunctionToAmbientCW -
      lower.thermalResistanceJunctionToAmbientCW);
  const interpolatedCurrent = lowerCurrent + (upperCurrent - lowerCurrent) * t;
  return Math.min(led.absoluteMaximum.forwardCurrentMAMax, interpolatedCurrent);
}

export function getPreferredReference(
  led: LedDefinition,
  options: { preferHomepageTypical?: boolean } = {},
): LedReference {
  const preferHomepageTypical = options.preferHomepageTypical ?? true;
  if (preferHomepageTypical && led.manufacturerHomepageTypical) {
    const homepage = led.manufacturerHomepageTypical;
    return {
      currentMA: homepage.currentMA,
      solderPointTempC: homepage.solderPointTempC,
      forwardVoltageV: homepage.forwardVoltageV,
      ppfUmolS: homepage.ppfUmolS,
      ppeUmolJ: homepage.ppeUmolJ,
      source: "homepage",
      note: homepage.note,
    };
  }
  return (
    led.reference ?? {
      currentMA: led.spectrumCalibration?.currentMA ?? 65,
      solderPointTempC: led.spectrumCalibration?.solderPointTempC ?? 25,
      forwardVoltageV: 2.7,
      source: "fallback",
      note: "No LED reference supplied.",
    }
  );
}

export function estimateLedOutput(
  led: LedDefinition,
  input: {
    preferHomepageTypical?: boolean;
    currentMA?: number;
    forwardVoltageV?: number;
    solderPointTempC?: number;
    ambientTempC?: number;
    thermalResistanceJunctionToAmbientCW?: number;
    limitCurrentToDeratingCurve?: boolean;
    systemEfficiency?: number;
  } = {},
) {
  const reference = getPreferredReference(led, input);
  // Some LED variants (e.g. standard LM301H CRI70/80/90) do not have a direct
  // datasheet PPF reference. We still need electrical estimates (V/I) for the UI
  // and wiring inference, so do not throw here. PPF/PPE will be 0 in that case
  // and should be estimated via spectrum calibration in higher-level code.
  const curves = LED_CURVES[led.curveSetId];
  const solderPointTempC = input.solderPointTempC ?? reference.solderPointTempC;
  const voltageTemperatureMultiplier =
    interpolateCurve(
      curves.relativeForwardVoltageBySolderPointTempC.points,
      solderPointTempC,
    ) / 100;
  let currentMA = input.currentMA;
  if (currentMA === undefined) {
    if (input.forwardVoltageV === undefined) {
      currentMA = reference.currentMA;
    } else {
      // Convert the measured voltage back to its approximate 25 C equivalent,
      // then read current from the Forward Current vs Forward Voltage curve.
      const equivalentVoltageAt25C =
        input.forwardVoltageV / voltageTemperatureMultiplier;
      currentMA = interpolateCurve(
        curves.forwardCurrentMAByForwardVoltageV.points,
        equivalentVoltageAt25C,
      );
    }
  }
  let deratedMaxCurrentMA;
  let currentWasLimitedByDeratingCurve = false;
  if (
    input.ambientTempC !== undefined &&
    input.thermalResistanceJunctionToAmbientCW !== undefined
  ) {
    deratedMaxCurrentMA = getDeratedMaxCurrentMA(led, {
      ambientTempC: input.ambientTempC,
      thermalResistanceJunctionToAmbientCW:
        input.thermalResistanceJunctionToAmbientCW,
    });
    if (input.limitCurrentToDeratingCurve && currentMA > deratedMaxCurrentMA) {
      currentMA = deratedMaxCurrentMA;
      currentWasLimitedByDeratingCurve = true;
    }
  }
  const currentMultiplier =
    interpolateCurve(curves.relativePpfByCurrentMA.points, currentMA) / 100;
  const temperatureMultiplier =
    interpolateCurve(
      curves.relativePpfBySolderPointTempC.points,
      solderPointTempC,
    ) / 100;
  const forwardVoltageAt25C = interpolateInverseCurve(
    curves.forwardCurrentMAByForwardVoltageV.points,
    currentMA,
  );
  const calculatedForwardVoltageV =
    forwardVoltageAt25C * voltageTemperatureMultiplier;
  const forwardVoltageV = input.forwardVoltageV ?? calculatedForwardVoltageV;
  const systemEfficiency = input.systemEfficiency ?? led.systemEfficiency;
  const basePpf = Number(reference.ppfUmolS);
  const ppfUmolS =
    Number.isFinite(basePpf) && basePpf > 0
      ? basePpf * currentMultiplier * temperatureMultiplier * systemEfficiency
      : 0;
  const electricalPowerW = (currentMA / 1000) * forwardVoltageV;
  const ppeUmolJ = electricalPowerW > 0 ? ppfUmolS / electricalPowerW : 0;
  return {
    ledId: led.id,
    currentMA,
    forwardVoltageV,
    solderPointTempC,
    electricalPowerW,
    ppfUmolS,
    ppeUmolJ,
    currentMultiplier,
    temperatureMultiplier,
    voltageTemperatureMultiplier,
    referenceSource: reference.source,
    deratedMaxCurrentMA,
    currentWasLimitedByDeratingCurve,
  };
}

// Migration helper for old code:
