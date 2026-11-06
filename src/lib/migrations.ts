import type { DatabaseSync } from "node:sqlite";

import { SEED_PRODUCTS } from "./catalog-seed.ts";
import { SEED_DISHES } from "./dish-seed.ts";

// Каждая строка — одна миграция. Уже применённые миграции не меняем:
// чтобы изменить схему, добавляем новый элемент в конец массива.
export const MIGRATIONS = [
  `
  CREATE TABLE products (
    id      INTEGER PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    kcal    REAL NOT NULL CHECK (kcal >= 0),
    protein REAL NOT NULL CHECK (protein >= 0),
    fat     REAL NOT NULL CHECK (fat >= 0),
    carbs   REAL NOT NULL CHECK (carbs >= 0)
  );

  CREATE TABLE pantry_items (
    id         INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products (id) ON DELETE CASCADE,
    grams      REAL NOT NULL CHECK (grams >= 0),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE diary_entries (
    id         INTEGER PRIMARY KEY,
    eaten_on   TEXT NOT NULL,
    meal       TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
    product_id INTEGER NOT NULL REFERENCES products (id),
    grams      REAL NOT NULL CHECK (grams > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX diary_entries_eaten_on ON diary_entries (eaten_on);
  `,
  `
  CREATE TABLE profile (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    sex        TEXT NOT NULL CHECK (sex IN ('female', 'male')),
    birth_date TEXT NOT NULL,
    height_cm  REAL NOT NULL CHECK (height_cm > 0),
    weight_kg  REAL NOT NULL CHECK (weight_kg > 0),
    activity   TEXT NOT NULL,
    goal       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
  `
  ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'other';

  CREATE TABLE dishes (
    id           INTEGER PRIMARY KEY,
    name         TEXT NOT NULL UNIQUE,
    cooked_grams REAL CHECK (cooked_grams > 0),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE dish_ingredients (
    dish_id    INTEGER NOT NULL REFERENCES dishes (id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    grams      REAL NOT NULL CHECK (grams > 0),
    PRIMARY KEY (dish_id, product_id)
  ) WITHOUT ROWID;

  CREATE INDEX dish_ingredients_product_id ON dish_ingredients (product_id);

  CREATE TABLE diary_entries_new (
    id         INTEGER PRIMARY KEY,
    eaten_on   TEXT NOT NULL,
    meal       TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
    product_id INTEGER REFERENCES products (id) ON DELETE RESTRICT,
    dish_id    INTEGER REFERENCES dishes (id) ON DELETE RESTRICT,
    grams      REAL NOT NULL CHECK (grams > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK ((product_id IS NULL) <> (dish_id IS NULL))
  );

  INSERT INTO diary_entries_new (id, eaten_on, meal, product_id, grams, created_at)
  SELECT id, eaten_on, meal, product_id, grams, created_at FROM diary_entries;

  DROP TABLE diary_entries;
  ALTER TABLE diary_entries_new RENAME TO diary_entries;
  CREATE INDEX diary_entries_eaten_on ON diary_entries (eaten_on);

  CREATE VIEW dish_nutrition AS
  SELECT
    d.id AS dish_id,
    d.name,
    COALESCE(d.cooked_grams, SUM(i.grams)) AS total_grams,
    SUM(i.grams * p.kcal)    / COALESCE(d.cooked_grams, SUM(i.grams)) AS kcal,
    SUM(i.grams * p.protein) / COALESCE(d.cooked_grams, SUM(i.grams)) AS protein,
    SUM(i.grams * p.fat)     / COALESCE(d.cooked_grams, SUM(i.grams)) AS fat,
    SUM(i.grams * p.carbs)   / COALESCE(d.cooked_grams, SUM(i.grams)) AS carbs
  FROM dishes d
  JOIN dish_ingredients i ON i.dish_id = d.id
  JOIN products p ON p.id = i.product_id
  GROUP BY d.id;
  `,
  `
  ALTER TABLE dishes ADD COLUMN instructions TEXT;
  `,
];

export function migrate(db: DatabaseSync) {
  const { user_version: version } = db
    .prepare("PRAGMA user_version")
    .get() as { user_version: number };

  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

// Только добавляет недостающее: значения продуктов и состав блюд,
// которые уже есть в базе, не меняются.
export function seedCatalog(db: DatabaseSync) {
  const insertProduct = db.prepare(
    `INSERT INTO products (name, kcal, protein, fat, carbs, category)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (name) DO UPDATE SET category = excluded.category
     WHERE products.category = 'other'`,
  );
  const insertDish = db.prepare(
    "INSERT OR IGNORE INTO dishes (name, cooked_grams, instructions) VALUES (?, ?, ?)",
  );
  const fillInstructions = db.prepare(
    "UPDATE dishes SET instructions = ? WHERE name = ? AND instructions IS NULL",
  );
  const insertIngredient = db.prepare(
    `INSERT INTO dish_ingredients (dish_id, product_id, grams)
     VALUES (?, (SELECT id FROM products WHERE name = ?), ?)`,
  );

  db.exec("BEGIN IMMEDIATE");
  try {
    for (const [category, rows] of Object.entries(SEED_PRODUCTS)) {
      for (const row of rows) insertProduct.run(...row, category);
    }

    for (const dish of SEED_DISHES) {
      const { changes, lastInsertRowid } = insertDish.run(
        dish.name,
        dish.cookedGrams ?? null,
        dish.instructions,
      );

      if (changes > 0) {
        for (const [product, grams] of dish.ingredients) {
          insertIngredient.run(lastInsertRowid, product, grams);
        }
      } else {
        fillInstructions.run(dish.instructions, dish.name);
      }
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
