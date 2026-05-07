import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = path.join(projectRoot, "src");
const sourceExtensions = [".js", ".ts", ".mjs"];

function resolveSourcePath(pathWithoutExtension) {
  if (existsSync(pathWithoutExtension)) {
    return pathWithoutExtension;
  }
  const extension = path.extname(pathWithoutExtension);
  if (extension === ".js") {
    const tsCandidate = `${pathWithoutExtension.slice(0, -extension.length)}.ts`;
    if (existsSync(tsCandidate)) {
      return tsCandidate;
    }
  }
  if (extension) return pathWithoutExtension;
  for (const extension of sourceExtensions) {
    const candidate = `${pathWithoutExtension}${extension}`;
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return `${pathWithoutExtension}.js`;
}

/**
 * Resolve Vite-style "@/..." imports for node:test.
 */
export function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/")) {
    const absolutePathWithoutExt = path.join(sourceRoot, specifier.slice(2));
    const absolutePath = resolveSourcePath(absolutePathWithoutExt);
    return defaultResolve(
      pathToFileURL(absolutePath).href,
      context,
      defaultResolve,
    );
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    (!path.extname(specifier) || path.extname(specifier) === ".js")
  ) {
    const parentPath = context.parentURL
      ? fileURLToPath(context.parentURL)
      : projectRoot;
    const absolutePathWithoutExt = path.resolve(
      path.dirname(parentPath),
      specifier,
    );
    const absolutePath = resolveSourcePath(absolutePathWithoutExt);
    return defaultResolve(
      pathToFileURL(absolutePath).href,
      context,
      defaultResolve,
    );
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
