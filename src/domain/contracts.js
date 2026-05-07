/**
 * Shared JSDoc contracts for the LED planner's "real version" architecture.
 *
 * The goal is not to model every implementation detail, but to make the
 * boundaries between catalog, domain, application, and presentation explicit.
 * These typedefs are consumed from plain JavaScript modules to keep phase 1 on
 * Vue + Vite + JS while still getting strong editor/type hints.
 */

/**
 * @typedef {Object} SpectralSeries
 * @property {string} id
 * @property {number[]} wavelengthNm
 * @property {number[]} intensityRel
 * @property {1|5} stepNm
 * @property {string} normalization
 * @property {string} source
 */

/**
 * @typedef {Object} SpectrumCalibration
 * @property {number} currentMA
 * @property {number} solderPointTempC
 * @property {number} [luminousFluxLm]
 * @property {number} [ppfUmolS]
 * @property {string} source
 * @property {string} [note]
 */

/**
 * @typedef {Object} LedDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} family
 * @property {number} [criMin]
 * @property {number} [cri]
 * @property {number} [cctK]
 * @property {string} [colorName]
 * @property {number} beamAngleDeg
 * @property {string} curveSetId
 * @property {number} systemEfficiency
 * @property {SpectrumCalibration} [spectrumCalibration]
 * @property {string|null} [spectralSeriesId]
 * @property {object} [reference]
 * @property {object} [manufacturerHomepageTypical]
 */

/**
 * @typedef {Object} BoardEmitterDrive
 * @property {"constantVoltage"|"constantCurrent"} driveMode
 * @property {number} voltageV
 * @property {number} currentA
 * @property {number} temperatureC
 * @property {number} seriesCount
 * @property {number} parallelCount
 */

/**
 * @typedef {Object} BoardEmitter
 * @property {string} id
 * @property {number} xMm
 * @property {number} yMm
 * @property {string} ledType
 * @property {BoardEmitterDrive} drive
 */

/**
 * @typedef {Object} BoardDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} ledType
 * @property {Array<BoardEmitter|{xMm:number,yMm:number,type?:string}>} emitters
 * @property {number} widthMm
 * @property {number} depthMm
 * @property {number} ledCount
 * @property {number} columns
 * @property {number} rows
 * @property {number} spacingXMm
 * @property {number} spacingYMm
 * @property {number} voltageV
 * @property {number} currentA
 * @property {number} temperatureC
 * @property {number} seriesCount
 * @property {number} parallelCount
 * @property {number} distanceCm
 * @property {number} roomWidthCm
 * @property {number} roomDepthCm
 * @property {number} photoperiodHours
 * @property {number} boardCount
 * @property {number} boardSpacingCm
 * @property {number} fixtureColumns
 * @property {number} fixtureRows
 * @property {number} fixtureSpacingXCm
 * @property {number} fixtureSpacingYCm
 */

/**
 * @typedef {Object} BoardInstance
 * @property {string} id
 * @property {string} name
 * @property {string} presetBoardId
 * @property {string} ledType
 * @property {number} widthMm
 * @property {number} depthMm
 * @property {number} ledCount
 * @property {number} columns
 * @property {number} rows
 * @property {number} spacingXMm
 * @property {number} spacingYMm
 * @property {Array<{xMm:number,yMm:number,type?:string}>} emitters
 * @property {number} xCm
 * @property {number} yCm
 * @property {number} rotationDeg
 * @property {{
 *   driveMode:"constantVoltage"|"constantCurrent",
 *   voltageV:number,
 *   currentA:number,
 *   temperatureC:number,
 *   seriesCount:number,
 *   parallelCount:number
 * }} drive
 */

/**
 * @typedef {Object} OperationResult
 * @property {boolean} ok
 * @property {unknown} [data]
 * @property {Array<AppIssue>} [warnings]
 * @property {Array<AppIssue>} [errors]
 */

/**
 * @typedef {Object} AppIssue
 * @property {string} code
 * @property {string} message
 * @property {"info"|"warning"|"error"} [severity]
 * @property {string} [field]
 */

/**
 * @typedef {Object} CctEstimate
 * @property {number|null} valueK
 * @property {string} method
 * @property {"low"|"medium"|"high"} [confidence]
 * @property {string|null} [warningCode]
 */

/**
 * @typedef {Object} BoardPlacementMoveResult
 * @property {boolean} ok
 * @property {"not-found"|"collision"} [reason]
 */

/**
 * @typedef {Object} LedComparisonColumn
 * @property {string} key
 * @property {string} label
 * @property {string} color
 * @property {Record<string, number>} stats
 * @property {number|null} photonFlux
 */

/**
 * @typedef {Object} ElectricalOperatingPoint
 * @property {number} boardVoltageV
 * @property {number} boardCurrentA
 * @property {number} seriesCount
 * @property {number} parallelCount
 * @property {number} perStringCurrentA
 * @property {number} perEmitterCurrentMA
 * @property {number} perEmitterForwardVoltageV
 * @property {number} inputPowerW
 * @property {boolean} usedExplicitWiring
 * @property {boolean} usedInferredWiring
 * @property {string|null} fallbackReason
 */

/**
 * @typedef {Object} PhotonOutputEstimate
 * @property {number} perEmitterPpfUmolS
 * @property {number} boardPpfUmolS
 * @property {boolean} isEstimated
 * @property {string} calibrationSource
 * @property {string} note
 */

/**
 * @typedef {Object} PpfdMapResult
 * @property {Float32Array} values
 * @property {Uint32Array} valuesUnits
 * @property {number} valueScale
 * @property {number} average
 * @property {number} min
 * @property {number} max
 * @property {number} averageUnits
 * @property {number} minUnits
 * @property {number} maxUnits
 * @property {number} gridWidth
 * @property {number} gridDepth
 * @property {number} inputPower
 * @property {number} boardPhotonFlux
 * @property {number} fixtureCount
 * @property {number} cellCount
 * @property {number} sourceCount
 * @property {number} sourceBinCells
 * @property {number} calculationMs
 * @property {ElectricalOperatingPoint} electrical
 * @property {PhotonOutputEstimate} photon
 */

export {};
