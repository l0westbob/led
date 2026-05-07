import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const assetsDirectory = path.join(repoRoot, "dist", "assets");

// Phase 7 budget: spectral data and secondary planner views are split out of
// the entry chunk. Keep every emitted JS asset below this ceiling.
const maximumJavaScriptBytes = 300_000;

function formatKilobytes(bytes) {
  return `${(bytes / 1000).toFixed(2)} kB`;
}

function listBuiltJavaScriptAssets() {
  if (!fs.existsSync(assetsDirectory)) {
    throw new Error(
      "dist/assets does not exist. Run `npm run build` before checking the bundle budget.",
    );
  }

  return fs
    .readdirSync(assetsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => {
      const assetPath = path.join(assetsDirectory, entry.name);
      return {
        name: entry.name,
        sizeBytes: fs.statSync(assetPath).size,
      };
    })
    .sort((left, right) => right.sizeBytes - left.sizeBytes);
}

try {
  const javascriptAssets = listBuiltJavaScriptAssets();
  if (javascriptAssets.length === 0) {
    throw new Error("No built JavaScript assets found under dist/assets.");
  }

  const largestAsset = javascriptAssets[0];
  if (largestAsset.sizeBytes > maximumJavaScriptBytes) {
    console.error(
      `Bundle budget exceeded: ${largestAsset.name} is ${formatKilobytes(
        largestAsset.sizeBytes,
      )}, budget is ${formatKilobytes(maximumJavaScriptBytes)}.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Bundle budget ok: ${largestAsset.name} is ${formatKilobytes(
        largestAsset.sizeBytes,
      )} / ${formatKilobytes(maximumJavaScriptBytes)}.`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
