/**
 * Turns a human-readable label into a safe storage id.
 *
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
