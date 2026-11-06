import assert from "node:assert/strict";
import { test } from "node:test";

import {
  matchRecipe,
  matchRecipes,
  parsePantryGrams,
  type Recipe,
} from "./recipes.ts";

function recipe(name: string, ingredients: [number, number][]): Recipe {
  return {
    id: 1,
    name,
    instructions: null,
    kcal: 100,
    totalGrams: 500,
    ingredients: ingredients.map(([productId, grams]) => ({
      productId,
      name: `Продукт ${productId}`,
      grams,
    })),
  };
}

test("продукт считается достаточным, если его хватает на рецепт", () => {
  const match = matchRecipe(
    recipe("Суп", [
      [1, 100],
      [2, 200],
      [3, 50],
    ]),
    new Map([
      [1, 100],
      [2, 150],
    ]),
  );

  assert.deepEqual(
    match.ingredients.map((row) => row.status),
    ["enough", "short", "missing"],
  );
  assert.equal(match.canCook, false);
  assert.equal(match.enough, 1);
  assert.equal(match.short, 1);
  assert.equal(match.missing, 1);
});

test("рецепт можно приготовить, когда всего хватает", () => {
  const match = matchRecipe(
    recipe("Суп", [[1, 100]]),
    new Map([[1, 500]]),
  );
  assert.equal(match.canCook, true);
});

test("рецепты без продуктов из дома не показываются", () => {
  const found = matchRecipes(
    [recipe("Суп", [[1, 100]]), recipe("Каша", [[2, 100]])],
    new Map([[2, 100]]),
  );
  assert.deepEqual(
    found.map((match) => match.name),
    ["Каша"],
  );
});

test("пустой дом не даёт рецептов", () => {
  assert.deepEqual(matchRecipes([recipe("Суп", [[1, 100]])], new Map()), []);
});

test("сначала идут рецепты, где меньше всего не хватает", () => {
  const stock = new Map([
    [1, 100],
    [2, 10],
  ]);

  const found = matchRecipes(
    [
      recipe("Два нет", [
        [1, 100],
        [3, 100],
        [4, 100],
      ]),
      recipe("Один нет", [
        [1, 100],
        [3, 100],
      ]),
      recipe("Мало", [
        [1, 100],
        [2, 100],
      ]),
      recipe("Всё есть", [[1, 100]]),
    ],
    stock,
  );

  assert.deepEqual(
    found.map((match) => match.name),
    ["Всё есть", "Мало", "Один нет", "Два нет"],
  );
});

test("вес продукта дома проверяется", () => {
  assert.equal(parsePantryGrams("250,5"), 250.5);
  for (const value of ["", "0", "-1", "abc", "200000"]) {
    assert.equal(parsePantryGrams(value), null, value);
  }
});
