import { BOARD_COLLECTION_SCHEMA_VERSION } from "@/contracts/versioned/contractVersions";
import type { BoardDefinitionDocument } from "@/contracts/versioned/boardDocuments";

export type BoardDefinitionDocumentCollection = {
  schema: "BoardDefinitionDocumentCollection";
  schemaVersion: string;
  exportedAtIso: string;
  boardCount: number;
  boards: BoardDefinitionDocument[];
};

/**
 * @param {{ exportedAtIso:string, boards:BoardDefinitionDocument[] }} input
 * @returns {BoardDefinitionDocumentCollection}
 */
export function createBoardDefinitionDocumentCollection(input: {
  exportedAtIso: string;
  boards: BoardDefinitionDocument[];
}): BoardDefinitionDocumentCollection {
  const boards = Array.isArray(input.boards) ? input.boards : [];
  return {
    schema: "BoardDefinitionDocumentCollection",
    schemaVersion: BOARD_COLLECTION_SCHEMA_VERSION,
    exportedAtIso: input.exportedAtIso,
    boardCount: boards.length,
    boards,
  };
}

function parseVersion(version: string) {
  const [major = 0, minor = 0] = String(version)
    .split(".")
    .map((part) => Number(part) || 0);
  return { major, minor };
}

export function isFutureBoardCollectionVersion(version: string) {
  const current = parseVersion(BOARD_COLLECTION_SCHEMA_VERSION);
  const candidate = parseVersion(version);
  return (
    candidate.major > current.major ||
    (candidate.major === current.major && candidate.minor > current.minor)
  );
}
