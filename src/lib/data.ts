import "server-only";

import { connection } from "next/server";

import { PRODUCT_CATEGORIES } from "@/lib/catalog-seed";
import { getDb } from "@/lib/db";
import {
  amountFor,
  MEALS,
  type CatalogItem,
  type ItemKind,
  type NewDish,
  type NewEntry,
  type NewProduct,
  type Product,
} from "@/lib/diary";
import { calculateNorm, type Profile } from "@/lib/nutrition";

// Норма, пока пользователь не заполнил профиль.
const DEFAULT_KCAL_GOAL = 2100;

type EntryRow = {
  id: number;
  meal: string;
  grams: number;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

// Локаль en-CA даёт дату в формате ГГГГ-ММ-ДД, как в базе.
function toDateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

type ProfileRow = {
  sex: Profile["sex"];
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  activity: Profile["activity"];
  goal: Profile["goal"];
};

export async function getProfile(): Promise<Profile | null> {
  // node:sqlite работает синхронно, поэтому без connection() запрос
  // выполнился бы при сборке и страница показывала бы устаревшие данные.
  await connection();

  const row = getDb().prepare("SELECT * FROM profile WHERE id = 1").get() as
    | ProfileRow
    | undefined;

  if (!row) return null;

  return {
    sex: row.sex,
    birthDate: row.birth_date,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    activity: row.activity,
    goal: row.goal,
  };
}

export function saveProfile(profile: Profile) {
  getDb()
    .prepare(
      `INSERT INTO profile (id, sex, birth_date, height_cm, weight_kg, activity, goal)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         sex = excluded.sex,
         birth_date = excluded.birth_date,
         height_cm = excluded.height_cm,
         weight_kg = excluded.weight_kg,
         activity = excluded.activity,
         goal = excluded.goal,
         updated_at = datetime('now')`,
    )
    .run(
      profile.sex,
      profile.birthDate,
      profile.heightCm,
      profile.weightKg,
      profile.activity,
      profile.goal,
    );
}

const DISH_CATEGORY = { id: "dishes", label: "Блюда" };

type ProductRow = Product & { category: string };
type DishRow = Omit<Product, "id"> & { dish_id: number };
type IngredientRow = { dish_id: number; name: string; grams: number };

export async function getCatalog() {
  await connection();
  const db = getDb();

  const products = db.prepare("SELECT * FROM products").all() as ProductRow[];
  const dishes = db
    .prepare("SELECT * FROM dish_nutrition")
    .all() as DishRow[];
  const ingredients = db
    .prepare(
      `SELECT i.dish_id, p.name, i.grams
       FROM dish_ingredients i
       JOIN products p ON p.id = i.product_id
       ORDER BY i.grams DESC`,
    )
    .all() as IngredientRow[];

  // Строки node:sqlite — объекты без прототипа, а React передаёт
  // в клиентские компоненты только обычные объекты, поэтому собираем новые.
  const items: CatalogItem[] = [
    ...products.map(({ id, name, category, kcal, protein, fat, carbs }) => ({
      key: `product:${id}`,
      name,
      category,
      kcal,
      protein,
      fat,
      carbs,
    })),
    ...dishes.map(({ dish_id, name, kcal, protein, fat, carbs }) => ({
      key: `dish:${dish_id}`,
      name,
      category: DISH_CATEGORY.id,
      kcal: Math.round(kcal),
      protein,
      fat,
      carbs,
      composition: ingredients
        .filter((row) => row.dish_id === dish_id)
        .map((row) => `${row.name} ${row.grams} г`)
        .join(", "),
    })),
  ];

  items.sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const categories = [DISH_CATEGORY, ...PRODUCT_CATEGORIES].filter(({ id }) =>
    items.some((item) => item.category === id),
  );

  return { items, categories };
}

export function itemExists(kind: ItemKind, id: number) {
  const query =
    kind === "product"
      ? "SELECT 1 FROM products WHERE id = ?"
      : "SELECT 1 FROM dish_nutrition WHERE dish_id = ?";

  return getDb().prepare(query).get(id) !== undefined;
}

// Сравниваем в JavaScript: LOWER() в SQLite не понимает кириллицу.
export function productNameTaken(name: string) {
  const rows = getDb().prepare("SELECT name FROM products").all() as {
    name: string;
  }[];
  const lowered = name.toLowerCase();
  return rows.some((row) => row.name.toLowerCase() === lowered);
}

export function createProduct(product: NewProduct) {
  getDb()
    .prepare(
      `INSERT INTO products (name, kcal, protein, fat, carbs)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      product.name,
      product.kcal,
      product.protein,
      product.fat,
      product.carbs,
    );
}

export function productsExist(ids: number[]) {
  const query = getDb().prepare("SELECT 1 FROM products WHERE id = ?");
  return ids.every((id) => query.get(id) !== undefined);
}

export function dishNameTaken(name: string) {
  const rows = getDb().prepare("SELECT name FROM dishes").all() as {
    name: string;
  }[];
  const lowered = name.toLowerCase();
  return rows.some((row) => row.name.toLowerCase() === lowered);
}

export function createDish(dish: NewDish) {
  const db = getDb();

  // Блюдо и его состав сохраняем вместе: без состава блюдо бессмысленно.
  db.exec("BEGIN IMMEDIATE");
  try {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO dishes (name, cooked_grams) VALUES (?, ?)")
      .run(dish.name, dish.cookedGrams);

    const insert = db.prepare(
      "INSERT INTO dish_ingredients (dish_id, product_id, grams) VALUES (?, ?, ?)",
    );
    for (const row of dish.ingredients) {
      insert.run(lastInsertRowid, row.productId, row.grams);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function addDiaryEntry(entry: NewEntry, date: Date) {
  getDb()
    .prepare(
      `INSERT INTO diary_entries (eaten_on, meal, product_id, dish_id, grams)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      toDateKey(date),
      entry.meal,
      entry.kind === "product" ? entry.itemId : null,
      entry.kind === "dish" ? entry.itemId : null,
      entry.grams,
    );
}

export function deleteDiaryEntry(id: number) {
  getDb().prepare("DELETE FROM diary_entries WHERE id = ?").run(id);
}

export async function getTodaySummary() {
  const profile = await getProfile();
  const now = new Date();

  const rows = getDb()
    .prepare(
      `SELECT d.id, d.meal, d.grams,
              COALESCE(p.name, n.name, 'Блюдо без состава') AS name,
              COALESCE(p.kcal, n.kcal, 0)       AS kcal,
              COALESCE(p.protein, n.protein, 0) AS protein,
              COALESCE(p.fat, n.fat, 0)         AS fat,
              COALESCE(p.carbs, n.carbs, 0)     AS carbs
       FROM diary_entries d
       LEFT JOIN products p ON p.id = d.product_id
       LEFT JOIN dish_nutrition n ON n.dish_id = d.dish_id
       WHERE d.eaten_on = ?
       ORDER BY d.id`,
    )
    .all(toDateKey(now)) as EntryRow[];

  const sum = (key: "kcal" | "protein" | "fat" | "carbs", list = rows) =>
    Math.round(
      list.reduce((total, row) => total + amountFor(row[key], row.grams), 0),
    );

  return {
    dateLabel: now.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    hasProfile: profile !== null,
    goal: profile ? calculateNorm(profile, now).target : DEFAULT_KCAL_GOAL,
    kcal: sum("kcal"),
    protein: sum("protein"),
    fat: sum("fat"),
    carbs: sum("carbs"),
    meals: MEALS.map(({ id, label }) => {
      const entries = rows.filter((row) => row.meal === id);

      return {
        id,
        label,
        kcal: sum("kcal", entries),
        entries: entries.map((row) => ({
          id: row.id,
          name: row.name,
          grams: row.grams,
          kcal: Math.round(amountFor(row.kcal, row.grams)),
        })),
      };
    }),
  };
}
