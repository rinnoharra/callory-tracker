import "server-only";

import { connection } from "next/server";

import { getDb } from "@/lib/db";
import {
  amountFor,
  MEALS,
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

export async function getProducts() {
  await connection();

  const rows = getDb()
    .prepare("SELECT * FROM products ORDER BY name")
    .all() as Product[];

  // Строки node:sqlite — объекты без прототипа, а React передаёт
  // в клиентские компоненты только обычные объекты.
  return rows.map((row) => ({ ...row }));
}

export function productExists(id: number) {
  return (
    getDb().prepare("SELECT 1 FROM products WHERE id = ?").get(id) !== undefined
  );
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

export function addDiaryEntry(entry: NewEntry, date: Date) {
  getDb()
    .prepare(
      `INSERT INTO diary_entries (eaten_on, meal, product_id, grams)
       VALUES (?, ?, ?, ?)`,
    )
    .run(toDateKey(date), entry.meal, entry.productId, entry.grams);
}

export function deleteDiaryEntry(id: number) {
  getDb().prepare("DELETE FROM diary_entries WHERE id = ?").run(id);
}

export async function getTodaySummary() {
  const profile = await getProfile();
  const now = new Date();

  const rows = getDb()
    .prepare(
      `SELECT d.id, d.meal, d.grams, p.name, p.kcal, p.protein, p.fat, p.carbs
       FROM diary_entries d
       JOIN products p ON p.id = d.product_id
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
