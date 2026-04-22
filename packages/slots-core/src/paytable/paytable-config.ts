/**
 * Paytable as authored by game designer.
 * Example: { "cherry": { 3: 10, 4: 25, 5: 100 } }
 */
export type PaytableConfig = Readonly<Record<string, Record<number, number>>>
