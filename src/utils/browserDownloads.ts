/**
 * Download a JSON-serializable payload from the browser.
 *
 * @param {{
 *   payload: unknown,
 *   filename: string,
 *   documentRef?: Document,
 *   urlRef?: Pick<URL, "createObjectURL"|"revokeObjectURL">
 * }} input
 */
export function downloadJsonPayload(input: {
  payload: unknown;
  filename: string;
  documentRef?: Document;
  urlRef?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
}) {
  const documentRef = input.documentRef ?? document;
  const urlRef = input.urlRef ?? URL;
  const payloadJson = JSON.stringify(input.payload, null, 2);
  const exportBlob = new Blob([payloadJson], { type: "application/json" });
  const downloadUrl = urlRef.createObjectURL(exportBlob);
  const anchorElement = documentRef.createElement("a");
  anchorElement.href = downloadUrl;
  anchorElement.download = input.filename;
  anchorElement.click();
  urlRef.revokeObjectURL(downloadUrl);
}
