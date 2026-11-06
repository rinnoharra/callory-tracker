import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import { PRODUCT_CATEGORIES, SEED_PRODUCTS } from "./catalog-seed.ts";
import { SEED_DISHES } from "./dish-seed.ts";
import { migrate, MIGRATIONS, seedCatalog } from "./migrations.ts";

function createDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  seedCatalog(db);
  return db;
}

function idOf(db: DatabaseSync, table: string, name: string) {
  const row = db.prepare(`SELECT id FROM ${table} WHERE name = ?`).get(name);
  return (row as { id: number }).id;
}

const allProducts = Object.values(SEED_PRODUCTS).flat();

test("в справочнике нет повторов и он достаточно большой", () => {
  const names = allProducts.map(([name]) => name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.length >= 200);
});

test("категории справочника описаны", () => {
  const known = PRODUCT_CATEGORIES.map((category) => category.id as string);
  for (const category of Object.keys(SEED_PRODUCTS)) {
    assert.ok(known.includes(category), category);
  }
});

test("калории продуктов сходятся с белками, жирами и углеводами", () => {
  for (const [name, kcal, protein, fat, carbs] of allProducts) {
    assert.ok(protein + fat + carbs <= 100, `${name}: БЖУ больше 100 г`);

    const expected = 4 * protein + 9 * fat + 4 * carbs;
    const tolerance = Math.max(15, kcal * 0.12);
    assert.ok(
      Math.abs(kcal - expected) <= tolerance,
      `${name}: ${kcal} ккал, по БЖУ ${Math.round(expected)}`,
    );
  }
});

test("ингредиенты блюд есть в справочнике", () => {
  const names = new Set(allProducts.map(([name]) => name));
  for (const dish of SEED_DISHES) {
    for (const [product] of dish.ingredients) {
      assert.ok(names.has(product), `${dish.name}: ${product}`);
    }
  }
});

test("у каждого рецепта есть инструкция и нет повторов", () => {
  const names = SEED_DISHES.map((dish) => dish.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.length >= 25);

  for (const dish of SEED_DISHES) {
    assert.ok(dish.instructions.length > 20, dish.name);
    const products = dish.ingredients.map(([product]) => product);
    assert.equal(new Set(products).size, products.length, dish.name);
  }
});

test("наполнение дописывает инструкции старым блюдам, но не меняет свои", () => {
  const db = createDb();
  db.exec(`
    UPDATE dishes SET instructions = NULL WHERE name = 'Борщ';
    UPDATE dishes SET instructions = 'Мой способ' WHERE name = 'Оливье';
  `);

  seedCatalog(db);

  const text = (name: string) =>
    (
      db.prepare("SELECT instructions FROM dishes WHERE name = ?").get(name) as {
        instructions: string;
      }
    ).instructions;

  assert.ok(text("Борщ").length > 20);
  assert.equal(text("Оливье"), "Мой способ");
});

test("миграция блюд сохраняет записи дневника и свои продукты", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const migration of MIGRATIONS.slice(0, 2)) db.exec(migration);
  db.exec("PRAGMA user_version = 2");

  db.exec(`
    INSERT INTO products (name, kcal, protein, fat, carbs)
    VALUES ('Банан', 100, 1, 1, 20), ('Мой продукт', 200, 10, 10, 10);
    INSERT INTO diary_entries (eaten_on, meal, product_id, grams)
    VALUES ('2026-11-06', 'lunch', 2, 150);
  `);

  migrate(db);
  seedCatalog(db);

  const entry = db.prepare("SELECT * FROM diary_entries").get() as {
    product_id: number;
    dish_id: number | null;
    grams: number;
  };
  assert.equal(entry.product_id, 2);
  assert.equal(entry.dish_id, null);
  assert.equal(entry.grams, 150);

  const banana = db
    .prepare("SELECT kcal, category FROM products WHERE name = 'Банан'")
    .get() as { kcal: number; category: string };
  assert.equal(banana.kcal, 100);
  assert.equal(banana.category, "fruits");

  const own = db
    .prepare("SELECT category FROM products WHERE name = 'Мой продукт'")
    .get() as { category: string };
  assert.equal(own.category, "other");
});

test("повторное наполнение ничего не дублирует", () => {
  const db = createDb();
  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

  const before = [count("products"), count("dishes"), count("dish_ingredients")];
  seedCatalog(db);
  assert.deepEqual(
    [count("products"), count("dishes"), count("dish_ingredients")],
    before,
  );
});

test("питательность блюда считается из его продуктов", () => {
  const db = createDb();
  const dish = db
    .prepare("SELECT * FROM dish_nutrition WHERE name = 'Творог с бананом и мёдом'")
    .get() as { total_grams: number; kcal: number };

  assert.equal(dish.total_grams, 260);
  // (150 × 121 + 100 × 96 + 10 × 328) / 260
  assert.equal(Math.round(dish.kcal), 119);
});

test("вес готового блюда меняет калорийность на 100 г", () => {
  const db = createDb();
  const dish = db
    .prepare("SELECT * FROM dish_nutrition WHERE name = 'Омлет с молоком'")
    .get() as { total_grams: number; kcal: number };

  assert.equal(dish.total_grams, 160);
  // (120 × 157 + 50 × 52 + 5 × 748) / 160
  assert.equal(Math.round(dish.kcal), 157);
});

test("запись дневника ссылается ровно на продукт или блюдо", () => {
  const db = createDb();
  const product = idOf(db, "products", "Банан");
  const dish = idOf(db, "dishes", "Борщ");
  const insert = db.prepare(
    `INSERT INTO diary_entries (eaten_on, meal, product_id, dish_id, grams)
     VALUES ('2026-11-06', 'lunch', ?, ?, 100)`,
  );

  insert.run(product, null);
  insert.run(null, dish);
  assert.throws(() => insert.run(null, null));
  assert.throws(() => insert.run(product, dish));
});

test("база не даёт удалить продукт и блюдо, которые используются", () => {
  const db = createDb();
  const ingredient = idOf(db, "products", "Свёкла");
  const dish = idOf(db, "dishes", "Борщ");

  assert.throws(() =>
    db.prepare("DELETE FROM products WHERE id = ?").run(ingredient),
  );

  db.prepare(
    `INSERT INTO diary_entries (eaten_on, meal, dish_id, grams)
     VALUES ('2026-11-06', 'lunch', ?, 300)`,
  ).run(dish);

  assert.throws(() => db.prepare("DELETE FROM dishes WHERE id = ?").run(dish));
});

test("при удалении блюда уходит его состав, но не продукты", () => {
  const db = createDb();
  const dish = idOf(db, "dishes", "Оливье");
  const products = db.prepare("SELECT COUNT(*) AS n FROM products");
  const before = (products.get() as { n: number }).n;

  db.prepare("DELETE FROM dishes WHERE id = ?").run(dish);

  const left = db
    .prepare("SELECT COUNT(*) AS n FROM dish_ingredients WHERE dish_id = ?")
    .get(dish) as { n: number };
  assert.equal(left.n, 0);
  assert.equal((products.get() as { n: number }).n, before);
});
