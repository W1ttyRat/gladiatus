// Postgres int columns overflow above this; reject bigger ids up front instead of letting the query throw a 500.
export const MAX_ID = 2_000_000_000;
export const isId = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_ID;
