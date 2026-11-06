import "server-only";

import { connection } from "next/server";

import { getDb } from "@/lib/db";

// Пока нет настроек пользователя, норма одна для всех.
const DAILY_KCAL_GOAL = 2100;

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

export async function getTodaySummary() {
  // node:sqlite работает синхронно, поэтому без connection() запрос
  // выполнился бы при сборке и страница показывала бы устаревшие данные.
  await connection();

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
    goal: DAILY_KCAL_GOAL,
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
