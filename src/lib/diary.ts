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

// Блюда с составом и готовая еда: то, что едят как есть,
// а не используют как ингредиент.
export function isPreparedFood(category: string) {
  return category === "dishes" || category === "ready";
}

export type NewDish = {
  name: string;
  cookedGrams: number | null;
  ingredients: { productId: number; grams: number }[];
};

export type DishField = "name" | "cookedGrams" | "ingredients";
export type DishErrors = Partial<Record<DishField, string>>;

type Nutrients = Pick<Product, "kcal" | "protein" | "fat" | "carbs">;

// Та же формула, что в представлении dish_nutrition: сумма по продуктам,
// делённая на вес готового блюда или, если его нет, на вес ингредиентов.
export function dishNutrition(
  ingredients: (Nutrients & { grams: number })[],
  cookedGrams: number | null,
) {
  const rawGrams = ingredients.reduce((total, row) => total + row.grams, 0);
  const totalGrams = cookedGrams ?? rawGrams;
  const total = (key: keyof Nutrients) =>
    ingredients.reduce((sum, row) => sum + amountFor(row[key], row.grams), 0);

  const per100 = (key: keyof Nutrients) =>
    totalGrams > 0 ? (total(key) / totalGrams) * 100 : 0;

  return {
    totalGrams,
    totalKcal: total("kcal"),
    kcal: per100("kcal"),
    protein: per100("protein"),
    fat: per100("fat"),
    carbs: per100("carbs"),
  };
}

type DishResult =
  | { ok: true; dish: NewDish }
  | { ok: false; errors: DishErrors };

function parseIngredients(json: string) {
  let rows: unknown;
  try {
    rows = JSON.parse(json);
  } catch {
    return null;
  }

  if (!Array.isArray(rows)) return null;

  return rows.map((row: { productId?: unknown; grams?: unknown }) => ({
    productId: Number(row?.productId),
    grams: parseNumber(String(row?.grams ?? "")),
  }));
}

export function parseNewDish(raw: Record<DishField, string>): DishResult {
  const errors: DishErrors = {};

  const name = raw.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) {
    errors.name = "Укажи название от 2 до 80 символов";
  }

  const hasCooked = raw.cookedGrams.trim() !== "";
  const cooked = hasCooked ? parseNumber(raw.cookedGrams) : null;
  if (cooked !== null && !(cooked >= 1 && cooked <= 50000)) {
    errors.cookedGrams = "Укажи вес от 1 до 50 000 г или оставь поле пустым";
  }

  const ingredients = parseIngredients(raw.ingredients) ?? [];
  const ids = ingredients.map((row) => row.productId);

  if (ingredients.length === 0) {
    errors.ingredients = "Добавь хотя бы один продукт";
  } else if (
    ids.some((id) => !Number.isInteger(id) || id <= 0) ||
    new Set(ids).size !== ids.length
  ) {
    errors.ingredients = "Проверь список продуктов";
  } else if (ingredients.some((row) => !(row.grams >= 1 && row.grams <= 20000))) {
    errors.ingredients = "Укажи вес каждого продукта от 1 до 20 000 г";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, dish: { name, cookedGrams: cooked, ingredients } };
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
