import { parseNumber } from "./nutrition.ts";

export type RecipeIngredient = {
  productId: number;
  name: string;
  grams: number;
};

export type Recipe = {
  id: number;
  name: string;
  instructions: string | null;
  kcal: number;
  totalGrams: number;
  ingredients: RecipeIngredient[];
};

export type IngredientStatus = "enough" | "short" | "missing";

// Ключ — id продукта, значение — сколько граммов его есть дома.
export type PantryStock = Map<number, number>;

export function matchRecipe(recipe: Recipe, stock: PantryStock) {
  const ingredients = recipe.ingredients.map((ingredient) => {
    const inStock = stock.get(ingredient.productId) ?? 0;
    const status: IngredientStatus =
      inStock >= ingredient.grams
        ? "enough"
        : inStock > 0
          ? "short"
          : "missing";

    return { ...ingredient, inStock, status };
  });

  const count = (status: IngredientStatus) =>
    ingredients.filter((row) => row.status === status).length;

  return {
    ...recipe,
    ingredients,
    enough: count("enough"),
    short: count("short"),
    missing: count("missing"),
    canCook: count("enough") === ingredients.length,
  };
}

export type RecipeMatch = ReturnType<typeof matchRecipe>;

// Сначала то, что можно приготовить сейчас, затем рецепты, где меньше
// всего не хватает. Рецепты без единого продукта из дома не показываем.
export function matchRecipes(recipes: Recipe[], stock: PantryStock) {
  return recipes
    .map((recipe) => matchRecipe(recipe, stock))
    .filter((match) => match.enough + match.short > 0)
    .sort(
      (a, b) =>
        a.missing - b.missing ||
        a.short - b.short ||
        b.enough - a.enough ||
        a.name.localeCompare(b.name, "ru"),
    );
}

export function parsePantryGrams(raw: string) {
  const grams = parseNumber(raw);
  return grams >= 1 && grams <= 100000 ? grams : null;
}
