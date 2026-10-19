// Rough shelf life (in days) by Open Food Facts category, used only when the catalog has no history.
// Order matters: the first matching tag wins, so more specific categories go first.
const SHELF_LIFE_BY_CATEGORY: [string, number][] = [
  ['en:frozen-foods', 90],
  ['en:yogurts', 20],
  ['en:cheeses', 30],
  ['en:milks', 10],
  ['en:dairies', 10],
  ['en:meats', 3],
  ['en:fishes', 2],
  ['en:breads', 5],
  ['en:fresh-vegetables', 7],
  ['en:fresh-fruits', 7],
  ['en:eggs', 21],
  ['en:beverages', 180],
  ['en:canned-foods', 365],
  ['en:pastas', 365],
  ['en:cereals-and-potatoes', 180],
  ['en:snacks', 120],
];

export const estimateShelfLifeDays = (categoriesTags: string[] = []): number | null => {
  const match = SHELF_LIFE_BY_CATEGORY.find(([tag]) => categoriesTags.includes(tag));
  return match ? match[1] : null;
};
