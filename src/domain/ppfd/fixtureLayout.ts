export type FixtureGridInput = {
  fixtureCount: number;
  fixtureColumns?: number;
  fixtureRows?: number;
};

export type FixtureGrid = {
  columns: number;
  rows: number;
  fixtureCount: number;
};

export type FixtureOffset = {
  xMm: number;
  yMm: number;
};

export type FixtureOffsetInput = {
  board: {
    boardCount?: number;
    boardSpacingCm?: number;
    fixtureColumns?: number;
    fixtureRows?: number;
    fixtureSpacingXCm?: number;
    fixtureSpacingYCm?: number;
  };
  fixtureCount?: number;
  explicitOffsetsMm?: FixtureOffset[];
};

export function resolveFixtureGrid(input: FixtureGridInput): FixtureGrid {
  const fixtureCount = Math.max(1, Math.floor(Number(input.fixtureCount) || 1));
  const explicitColumns = Math.max(
    0,
    Math.floor(Number(input.fixtureColumns) || 0),
  );
  const explicitRows = Math.max(0, Math.floor(Number(input.fixtureRows) || 0));

  if (explicitColumns > 0 && explicitRows > 0) {
    return {
      columns: explicitColumns,
      rows: explicitRows,
      fixtureCount,
    };
  }

  const columns = Math.ceil(Math.sqrt(fixtureCount));
  const rows = Math.ceil(fixtureCount / columns);
  return { columns, rows, fixtureCount };
}

export function resolveFixtureOffsetsMm(
  input: FixtureOffsetInput,
): FixtureOffset[] {
  const explicitOffsetsMm = Array.isArray(input.explicitOffsetsMm)
    ? input.explicitOffsetsMm
    : [];
  if (explicitOffsetsMm.length > 0) {
    return explicitOffsetsMm.map((offset) => ({
      xMm: Number(offset.xMm) || 0,
      yMm: Number(offset.yMm) || 0,
    }));
  }

  const fixtureCount = Math.max(
    1,
    Math.floor(Number(input.fixtureCount ?? input.board.boardCount) || 1),
  );
  const { columns, rows } = resolveFixtureGrid({
    fixtureCount,
    fixtureColumns: input.board.fixtureColumns,
    fixtureRows: input.board.fixtureRows,
  });
  const spacingXmm =
    (Number(input.board.fixtureSpacingXCm ?? input.board.boardSpacingCm) || 0) *
    10;
  const spacingYmm =
    (Number(input.board.fixtureSpacingYCm ?? input.board.boardSpacingCm) || 0) *
    10;
  const startXmm = -((columns - 1) * spacingXmm) * 0.5;
  const startYmm = -((rows - 1) * spacingYmm) * 0.5;

  const fixtureOffsets: FixtureOffset[] = [];
  let fixtureIndex = 0;
  for (
    let fixtureRowIndex = 0;
    fixtureRowIndex < rows && fixtureIndex < fixtureCount;
    fixtureRowIndex += 1
  ) {
    for (
      let fixtureColumnIndex = 0;
      fixtureColumnIndex < columns && fixtureIndex < fixtureCount;
      fixtureColumnIndex += 1, fixtureIndex += 1
    ) {
      fixtureOffsets.push({
        xMm: startXmm + fixtureColumnIndex * spacingXmm,
        yMm: startYmm + fixtureRowIndex * spacingYmm,
      });
    }
  }

  return fixtureOffsets;
}
