export const CATEGORIES = [
  "Dairy & Alternatives",
  "Grains",
  "Pantry",
  "Produce",
  "Proteins",
  "Snacks",
] as const;

export const UNITS = [
  "item",
  "lbs",
  "oz",
  "kg",
  "g",
  "cans",
  "bags",
  "boxes",
  "bottles",
  "cartons",
  "jars",
  "cases",
  "bunches",
  "gallons",
  "liters",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Unit = (typeof UNITS)[number];

/** Normalize raw unit strings (from CSV, freehand input, etc.) to a canonical UNITS value. */
export function normalizeUnit(raw: string): string {
  const s = raw.trim().toLowerCase();
  const aliases: Record<string, string> = {
    lb: "lbs", pound: "lbs", pounds: "lbs",
    ounce: "oz", ounces: "oz",
    kilogram: "kg", kilograms: "kg",
    gram: "g", grams: "g",
    can: "cans",
    bag: "bags",
    box: "boxes",
    bottle: "bottles",
    carton: "cartons",
    jar: "jars",
    "case": "cases",
    bunch: "bunches",
    gallon: "gallons",
    liter: "liters", litre: "liters", litres: "liters",
    items: "item",
  };
  if (aliases[s]) return aliases[s];
  if ((UNITS as readonly string[]).includes(s)) return s;
  return "item";
}
