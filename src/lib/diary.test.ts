import assert from "node:assert/strict";
import { test } from "node:test";

import {
  amountFor,
  dishNutrition,
  isPreparedFood,
  mealForHour,
  parseEntry,
  parseNewDish,
  parseNewProduct,
} from "./diary.ts";

const dish = {
  name: "Каша",
  cookedGrams: "",
  ingredients: '[{"productId":1,"grams":"100"},{"productId":2,"grams":"50,5"}]',
};

test("блюдо принимает верные данные и чистит название", () => {
  const result = parseNewDish({ ...dish, name: "  Каша   с ягодами " });
  assert.deepEqual(result, {
    ok: true,
    dish: {
      name: "Каша с ягодами",
      cookedGrams: null,
      ingredients: [
        { productId: 1, grams: 100 },
        { productId: 2, grams: 50.5 },
      ],
    },
  });
});

test("вес готового блюда необязателен, но должен быть разумным", () => {
  const ok = parseNewDish({ ...dish, cookedGrams: "300" });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.dish.cookedGrams, 300);

  for (const cookedGrams of ["0", "abc", "-5", "100000"]) {
    const result = parseNewDish({ ...dish, cookedGrams });
    assert.equal(result.ok, false, cookedGrams);
    if (!result.ok) assert.ok(result.errors.cookedGrams);
  }
});

test("блюдо отклоняет неверный список продуктов", () => {
  const broken = [
    "",
    "not json",
    "{}",
    "[]",
    "[null]",
    '[{"productId":0,"grams":"100"}]',
    '[{"productId":1,"grams":"0"}]',
    '[{"productId":1,"grams":""}]',
    '[{"productId":1,"grams":"10"},{"productId":1,"grams":"20"}]',
  ];

  for (const ingredients of broken) {
    const result = parseNewDish({ ...dish, ingredients });
    assert.equal(result.ok, false, ingredients);
    if (!result.ok) assert.ok(result.errors.ingredients, ingredients);
  }
});

test("блюдо требует название", () => {
  const result = parseNewDish({ ...dish, name: " " });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.name);
});

test("питательность блюда считается по весу ингредиентов", () => {
  const result = dishNutrition(
    [
      { grams: 100, kcal: 300, protein: 10, fat: 5, carbs: 50 },
      { grams: 300, kcal: 40, protein: 2, fat: 1, carbs: 5 },
    ],
    null,
  );

  assert.equal(result.totalGrams, 400);
  assert.equal(result.totalKcal, 420);
  assert.equal(result.kcal, 105);
  assert.equal(result.protein, 4);
});

test("вес готового блюда меняет значения на 100 г, но не общие калории", () => {
  const result = dishNutrition(
    [{ grams: 100, kcal: 300, protein: 10, fat: 5, carbs: 50 }],
    250,
  );

  assert.equal(result.totalKcal, 300);
  assert.equal(result.kcal, 120);
});

test("блюда и готовая еда отделены от продуктов", () => {
  assert.equal(isPreparedFood("dishes"), true);
  assert.equal(isPreparedFood("ready"), true);
  assert.equal(isPreparedFood("meat"), false);
  assert.equal(isPreparedFood("other"), false);
});

test("пустое блюдо не ломает расчёт", () => {
  assert.equal(dishNutrition([], null).kcal, 0);
});

const product = {
  name: "Сырники",
  kcal: "220",
  protein: "15",
  fat: "9,5",
  carbs: "20",
};

test("приём пищи подбирается по времени суток", () => {
  assert.equal(mealForHour(8), "breakfast");
  assert.equal(mealForHour(11), "lunch");
  assert.equal(mealForHour(16), "dinner");
  assert.equal(mealForHour(21), "snack");
  assert.equal(mealForHour(3), "snack");
});

test("калории порции считаются от значения на 100 г", () => {
  assert.equal(amountFor(343, 90), 308.7);
  assert.equal(amountFor(100, 250), 250);
});

test("запись дневника принимает верные данные и запятую", () => {
  const result = parseEntry({ item: "product:3", grams: "150,5", meal: "lunch" });
  assert.deepEqual(result, {
    ok: true,
    entry: { kind: "product", itemId: 3, grams: 150.5, meal: "lunch" },
  });
});

test("запись дневника принимает блюдо", () => {
  const result = parseEntry({ item: "dish:7", grams: "300", meal: "dinner" });
  assert.deepEqual(result, {
    ok: true,
    entry: { kind: "dish", itemId: 7, grams: 300, meal: "dinner" },
  });
});

test("запись дневника отклоняет неверные данные", () => {
  const result = parseEntry({ item: "", grams: "0", meal: "brunch" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(Object.keys(result.errors).sort(), [
      "grams",
      "item",
      "meal",
    ]);
  }
});

test("запись дневника отклоняет чужой тип ссылки", () => {
  for (const item of ["user:1", "dish:0", "dish:1; DROP", "product:-1"]) {
    const result = parseEntry({ item, grams: "100", meal: "lunch" });
    assert.equal(result.ok, false, item);
  }
});

test("новый продукт принимает верные данные и чистит название", () => {
  const result = parseNewProduct({ ...product, name: "  Сырники   с изюмом " });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.product.name, "Сырники с изюмом");
    assert.equal(result.product.fat, 9.5);
  }
});

test("новый продукт отклоняет пустые значения", () => {
  const result = parseNewProduct({ ...product, name: " ", kcal: "", fat: "" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(Object.keys(result.errors).sort(), [
      "fat",
      "kcal",
      "name",
    ]);
  }
});

test("сумма белков, жиров и углеводов не больше 100 г", () => {
  const result = parseNewProduct({
    ...product,
    protein: "50",
    fat: "40",
    carbs: "30",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.carbs);
});
