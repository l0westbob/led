import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = path.join(projectRoot, "src");

/**
 * Resolve Vite-style "@/..." imports for node:test.
 */
export function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/")) {
    const absolutePathWithoutExt = path.join(sourceRoot, specifier.slice(2));
    const absolutePath = path.extname(absolutePathWithoutExt)
      ? absolutePathWithoutExt
      : `${absolutePathWithoutExt}.js`;
    return defaultResolve(pathToFileURL(absolutePath).href, context, defaultResolve);
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !path.extname(specifier)
  ) {
    return defaultResolve(`${specifier}.js`, context, defaultResolve);
  }

  return defaultResolve(specifier, context, defaultResolve);
}

/**
 * Allow JSON files to be imported in node:test without import attributes.
 */
export async function load(url, context, defaultLoad) {
  if (url.endsWith(".json")) {
    const source = await readFile(new URL(url), "utf8");
    return {
      format: "module",
      source: `export default ${source};`,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
