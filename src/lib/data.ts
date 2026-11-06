import "server-only";

import { connection } from "next/server";

import { getDb } from "@/lib/db";
import { calculateNorm, type Profile } from "@/lib/nutrition";

// Норма, пока пользователь не заполнил профиль.
const DEFAULT_KCAL_GOAL = 2100;

const MEALS = [
  { id: "breakfast", label: "Завтрак" },
  { id: "lunch", label: "Обед" },
  { id: "dinner", label: "Ужин" },
  { id: "snack", label: "Перекус" },
] as const;

type MealRow = {
  meal: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

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

export async function getTodaySummary() {
  const profile = await getProfile();

  const now = new Date();
  // Локаль en-CA даёт дату в формате ГГГГ-ММ-ДД, как в базе.
  const today = now.toLocaleDateString("en-CA");

  const rows = getDb()
    .prepare(
      `SELECT d.meal,
              SUM(d.grams * p.kcal / 100)    AS kcal,
              SUM(d.grams * p.protein / 100) AS protein,
              SUM(d.grams * p.fat / 100)     AS fat,
              SUM(d.grams * p.carbs / 100)   AS carbs
       FROM diary_entries d
       JOIN products p ON p.id = d.product_id
       WHERE d.eaten_on = ?
       GROUP BY d.meal`,
    )
    .all(today) as MealRow[];

  const sum = (key: "kcal" | "protein" | "fat" | "carbs") =>
    Math.round(rows.reduce((total, row) => total + row[key], 0));

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
    meals: MEALS.map(({ id, label }) => ({
      id,
      label,
      kcal: Math.round(rows.find((row) => row.meal === id)?.kcal ?? 0),
    })),
  };
}
