import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  deletePantryItemAction,
  updatePantryItemAction,
} from "@/app/pantry/actions";
import { inputClass } from "@/components/form-fields";
import { PantryForm } from "@/components/pantry-form";
import { getCatalog, getPantry } from "@/lib/data";
import { isPreparedFood } from "@/lib/diary";

export const metadata: Metadata = { title: "Дома — Трекер калорий" };

async function Pantry() {
  const [pantry, { items }] = await Promise.all([getPantry(), getCatalog()]);

  return (
    <>
      <PantryForm
        products={items.filter((item) => !isPreparedFood(item.category))}
      />

      <section aria-label="Продукты дома" className="flex flex-col gap-3">
        {pantry.length > 0 ? (
          <>
            <ul className="divide-y divide-tint">
              {pantry.map((item) => (
                <li key={item.productId} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <form
                    action={updatePantryItemAction}
                    className="flex items-center gap-1"
                  >
                    <input type="hidden" name="productId" value={item.productId} />
                    <input
                      key={item.grams}
                      name="grams"
                      aria-label={`Граммы: ${item.name}`}
                      inputMode="decimal"
                      defaultValue={item.grams}
                      className={`${inputClass} w-20! text-right tabular-nums`}
                    />
                    <button
                      type="submit"
                      aria-label={`Сохранить вес: ${item.name}`}
                      className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-tint"
                    >
                      ✓
                    </button>
                  </form>
                  <form action={deletePantryItemAction}>
                    <input type="hidden" name="productId" value={item.productId} />
                    <button
                      type="submit"
                      aria-label={`Убрать: ${item.name}`}
                      className="flex size-8 items-center justify-center rounded-lg text-lg leading-none text-ink-muted transition-colors hover:bg-tint"
                    >
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <Link
              href="/recipes"
              className="rounded-xl border border-line px-4 py-3 text-center font-medium transition-colors hover:bg-tint"
            >
              Подобрать рецепты
            </Link>
          </>
        ) : (
          <p className="rounded-xl bg-tint p-3 text-sm">
            Добавь то, что есть дома, и приложение подберёт рецепты.
          </p>
        )}
      </section>
    </>
  );
}

export default function PantryPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header>
        <Link href="/" className="text-sm text-ink-muted hover:underline">
          ← Сегодня
        </Link>
        <h1 className="text-2xl font-medium tracking-tight">Дома</h1>
      </header>
      <Suspense fallback={<div className="h-96 rounded-xl bg-tint" />}>
        <Pantry />
      </Suspense>
    </main>
  );
}
