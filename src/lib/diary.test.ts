import assert from "node:assert/strict";
import { test } from "node:test";

import {
  amountFor,
  mealForHour,
  parseEntry,
  parseNewProduct,
} from "./diary.ts";

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
  const result = parseEntry({ productId: "3", grams: "150,5", meal: "lunch" });
  assert.deepEqual(result, {
    ok: true,
    entry: { productId: 3, grams: 150.5, meal: "lunch" },
  });
});

test("запись дневника отклоняет неверные данные", () => {
  const result = parseEntry({ productId: "", grams: "0", meal: "brunch" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(Object.keys(result.errors).sort(), [
      "grams",
      "meal",
      "productId",
    ]);
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
