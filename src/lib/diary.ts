import { parseNumber } from "./nutrition.ts";

export const MEALS = [
  { id: "breakfast", label: "Завтрак" },
  { id: "lunch", label: "Обед" },
  { id: "dinner", label: "Ужин" },
  { id: "snack", label: "Перекус" },
] as const;

export type MealId = (typeof MEALS)[number]["id"];

export type Product = {
  id: number;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type NewProduct = Omit<Product, "id">;

export type ItemKind = "product" | "dish";

// Строка для выбора в форме: продукт или блюдо со значениями на 100 г.
export type CatalogItem = Omit<Product, "id"> & {
  key: string;
  category: string;
  composition?: string;
};

export type NewEntry = {
  kind: ItemKind;
  itemId: number;
  grams: number;
  meal: MealId;
};

export type EntryField = "item" | "grams" | "meal";
export type EntryErrors = Partial<Record<EntryField, string>>;
export type ProductField = keyof NewProduct;
export type ProductErrors = Partial<Record<ProductField, string>>;

// Какой приём пищи предложить, исходя из времени суток.
export function mealForHour(hour: number): MealId {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 21) return "dinner";
  return "snack";
}

// Значения в справочнике указаны на 100 г.
export function amountFor(per100: number, grams: number) {
  return (per100 * grams) / 100;
}

type EntryResult =
  | { ok: true; entry: NewEntry }
  | { ok: false; errors: EntryErrors };

export function parseEntry(raw: Record<EntryField, string>): EntryResult {
  const errors: EntryErrors = {};

  const item = /^(product|dish):([1-9]\d*)$/.exec(raw.item);
  if (!item) errors.item = "Выбери продукт или блюдо";

  const grams = parseNumber(raw.grams);
  if (!(grams >= 1 && grams <= 5000)) {
    errors.grams = "Укажи вес порции от 1 до 5000 г";
  }

  const meal = MEALS.find((m) => m.id === raw.meal)?.id;
  if (!meal) errors.meal = "Выбери приём пищи";

  if (!item || !meal || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    entry: {
      kind: item[1] as ItemKind,
      itemId: Number(item[2]),
      grams,
      meal,
    },
  };
}

type ProductResult =
  | { ok: true; product: NewProduct }
  | { ok: false; errors: ProductErrors };

export function parseNewProduct(
  raw: Record<ProductField, string>,
): ProductResult {
  const errors: ProductErrors = {};

  const name = raw.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) {
    errors.name = "Укажи название от 2 до 80 символов";
  }

  const kcal = parseNumber(raw.kcal);
  if (!(kcal >= 0 && kcal <= 900)) {
    errors.kcal = "Укажи от 0 до 900 ккал";
  }

  const protein = parseNumber(raw.protein);
  const fat = parseNumber(raw.fat);
  const carbs = parseNumber(raw.carbs);
  const macroError = "Укажи от 0 до 100 г";

  if (!(protein >= 0 && protein <= 100)) errors.protein = macroError;
  if (!(fat >= 0 && fat <= 100)) errors.fat = macroError;
  if (!(carbs >= 0 && carbs <= 100)) errors.carbs = macroError;

  if (
    !errors.protein &&
    !errors.fat &&
    !errors.carbs &&
    protein + fat + carbs > 100
  ) {
    errors.carbs = "Белки, жиры и углеводы вместе не больше 100 г";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, product: { name, kcal, protein, fat, carbs } };
}
