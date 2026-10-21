// Fixed list so units stay consistent and translatable; amounts are stored as entered (no conversions)
export const UNITS = ['unit', 'g', 'kg', 'ml', 'l'] as const;

export type Unit = (typeof UNITS)[number];

export const DEFAULT_UNIT: Unit = 'unit';

export const isUnit = (value: unknown): value is Unit =>
  typeof value === 'string' && (UNITS as readonly string[]).includes(value);

/** Items counted in units must be whole; weights and volumes can be fractional. */
export const isValidQuantity = (quantity: number, unit: Unit): boolean =>
  quantity > 0 && (unit !== 'unit' || Number.isInteger(quantity));
