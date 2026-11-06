import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DishForm } from "@/components/dish-form";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = { title: "Новое блюдо — Трекер калорий" };

async function NewDish() {
  const { items } = await getCatalog();

  return (
    <DishForm products={items.filter((item) => item.key.startsWith("product:"))} />
  );
}

export default function NewDishPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header>
        <Link href="/add" className="text-sm text-ink-muted hover:underline">
          ← Добавить еду
        </Link>
        <h1 className="text-2xl font-medium tracking-tight">Новое блюдо</h1>
      </header>
      <Suspense fallback={<div className="h-96 rounded-xl bg-tint" />}>
        <NewDish />
      </Suspense>
    </main>
  );
}
