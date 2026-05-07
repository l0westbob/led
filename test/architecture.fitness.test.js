import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(".");

function listSourceFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(absolutePath));
    } else if (/\.(js|ts|vue|mjs)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }
  return files;
}

function readRelativeFile(absolutePath) {
  return {
    absolutePath,
    relativePath: path.relative(REPO_ROOT, absolutePath),
    contents: fs.readFileSync(absolutePath, "utf8"),
  };
}

function listFilesFromPath(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  const stat = fs.statSync(absolutePath);
  return stat.isDirectory() ? listSourceFiles(absolutePath) : [absolutePath];
}

test("architecture: runtime source tree contains no JavaScript modules", () => {
  const offenders = listSourceFiles(path.join(REPO_ROOT, "src"))
    .map(readRelativeFile)
    .filter((file) => file.relativePath.endsWith(".js"))
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: Vue source scripts are typed", () => {
  const untypedScriptSetupPattern =
    /<script\s+setup(?![^>]*\blang=["']ts["'])[^>]*>/;
  const offenders = listSourceFiles(path.join(REPO_ROOT, "src"))
    .map(readRelativeFile)
    .filter((file) => file.relativePath.endsWith(".vue"))
    .filter((file) => untypedScriptSetupPattern.test(file.contents))
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: public contracts avoid broad any and untyped Function", () => {
  const broadUntypedPattern = /\bany\b|:\s*Function\b|Record<string,\s*any>/;
  const publicContractFiles = [
    "src/domain/contracts.ts",
    "src/application/planner/useCases/contracts.ts",
    "src/contracts/versioned",
    "src/stores/plannerStore.ts",
    "src/stores/ledLabStore.ts",
  ].flatMap(listFilesFromPath);
  const offenders = publicContractFiles
    .map(readRelativeFile)
    .filter((file) => broadUntypedPattern.test(file.contents))
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: application services do not use direct runtime randomness or clocks", () => {
  const offenders = listSourceFiles(path.join(REPO_ROOT, "src/application"))
    .map(readRelativeFile)
    .filter((file) =>
      /Date\.now\(|Math\.random\(|performance\.now\(/.test(file.contents),
    )
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: components do not import domain modules directly", () => {
  const offenders = listSourceFiles(path.join(REPO_ROOT, "src/components"))
    .map(readRelativeFile)
    .filter((file) => /from\s+["']@\/domain\//.test(file.contents))
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: application layer does not depend on stores", () => {
  const offenders = listSourceFiles(path.join(REPO_ROOT, "src/application"))
    .map(readRelativeFile)
    .filter((file) => /from\s+["']@\/stores\//.test(file.contents))
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: domain layer does not depend on application, stores, or components", () => {
  const offenders = listSourceFiles(path.join(REPO_ROOT, "src/domain"))
    .map(readRelativeFile)
    .filter((file) =>
      /from\s+["']@\/(application|stores|components)\//.test(file.contents),
    )
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: contracts do not depend on presentation layers", () => {
  const offenders = listSourceFiles(path.join(REPO_ROOT, "src/contracts"))
    .map(readRelativeFile)
    .filter((file) =>
      /from\s+["']@\/(stores|components|pages)\//.test(file.contents),
    )
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: stores do not import components", () => {
  const offenders = listSourceFiles(path.join(REPO_ROOT, "src/stores"))
    .map(readRelativeFile)
    .filter((file) => /from\s+["']@\/components\//.test(file.contents))
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: planner use-case public docs avoid broad dependency placeholders", () => {
  const broadDependencyPattern = /Record<string,\s*any>|:\s*Function\b/;
  const offenders = listSourceFiles(
    path.join(REPO_ROOT, "src/application/planner/useCases"),
  )
    .concat(path.join(REPO_ROOT, "src/application/planner/plannerUseCases.ts"))
    .map(readRelativeFile)
    .filter((file) => broadDependencyPattern.test(file.contents))
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: LED catalog data modules do not import output algorithms", () => {
  const dataModules = [
    "src/domain/led/ledCurves.ts",
    "src/domain/led/ledChromaticity.ts",
    "src/domain/led/ledDefinitionData.ts",
    "src/domain/led/ledDefinitions.ts",
  ];
  const offenders = dataModules
    .map((filePath) => readRelativeFile(path.join(REPO_ROOT, filePath)))
    .filter((file) =>
      /from\s+["']@\/domain\/led\/ledOutputModel/.test(file.contents),
    )
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});

test("architecture: presentation SFCs use adapters for import/export and preview snapshots", () => {
  const directBoundaryPattern =
    /from\s+["']@\/application\/boardLibrary\/boardLibraryImportExport|buildBoardPlannerPreviewSnapshotEnvelope/;
  const offenders = listSourceFiles(path.join(REPO_ROOT, "src"))
    .map(readRelativeFile)
    .filter((file) => file.relativePath.endsWith(".vue"))
    .filter((file) => directBoundaryPattern.test(file.contents))
    .map((file) => file.relativePath);

  assert.deepEqual(offenders, []);
});
