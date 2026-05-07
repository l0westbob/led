import { register } from "node:module";
import { pathToFileURL } from "node:url";

/**
 * Register the local alias/json loader for node:test using the stable
 * register()-based bootstrap path.
 */
register("./test/alias-loader.mjs", pathToFileURL("./"));
