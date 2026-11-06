import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AddFoodForm } from "@/components/add-food-form";
import { getProducts } from "@/lib/data";
import { mealForHour } from "@/lib/diary";

export const metadata: Metadata = { title: "Добавить еду — Трекер калорий" };

async function AddFood() {
  const products = await getProducts();

  return (
    <AddFoodForm
      products={products}
      defaultMeal={mealForHour(new Date().getHours())}
    />
  );
}

export default function AddPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header>
        <Link href="/" className="text-sm text-ink-muted hover:underline">
          ← Сегодня
        </Link>
        <h1 className="text-2xl font-medium tracking-tight">Добавить еду</h1>
      </header>
      <Suspense fallback={<div className="h-96 rounded-xl bg-tint" />}>
        <AddFood />
      </Suspense>
    </main>
  );
}
