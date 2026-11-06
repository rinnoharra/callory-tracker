import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { getRecipeMatches } from "@/lib/data";
import type { RecipeMatch } from "@/lib/recipes";

export const metadata: Metadata = { title: "Рецепты — Трекер калорий" };

const MAX_PARTIAL = 12;

function summaryOf(match: RecipeMatch) {
  if (match.canCook) return "Всего хватает";

  const lacking = match.ingredients
    .filter((row) => row.status !== "enough")
    .map((row) => {
      const name = row.name.toLowerCase();
      return row.status === "short" ? `${name} (мало)` : name;
    });

  return `Не хватает: ${lacking.join(", ")}`;
}

function statusOf(row: RecipeMatch["ingredients"][number]) {
  if (row.status === "enough") return "есть";
  if (row.status === "short") return `дома ${row.inStock} г`;
  return "нет";
}

function RecipeCard({ match }: { match: RecipeMatch }) {
  return (
    <details className="group rounded-xl border border-line">
      <summary className="flex cursor-pointer list-none flex-col gap-0.5 p-3">
        <span className="flex justify-between gap-3">
          <span className="font-medium">{match.name}</span>
          <span className="shrink-0 text-sm text-ink-muted tabular-nums">
            {match.kcal} ккал
          </span>
        </span>
        <span className={match.canCook ? "text-sm text-ink-muted" : "text-sm text-over-text"}>
          {summaryOf(match)}
        </span>
      </summary>

      <div className="flex flex-col gap-3 border-t border-tint p-3 text-sm">
        <p className="text-ink-muted">
          На всё блюдо, примерно {match.totalGrams} г. Калории указаны на 100 г.
        </p>
        <ul className="flex flex-col gap-1">
          {match.ingredients.map((row) => (
            <li key={row.productId} className="flex justify-between gap-3">
              <span className="min-w-0">
                {row.name}, {row.grams} г
              </span>
              <span
                className={
                  row.status === "enough"
                    ? "shrink-0 text-ink-muted"
                    : "shrink-0 text-over-text"
                }
              >
                {statusOf(row)}
              </span>
            </li>
          ))}
        </ul>
        <p>{match.instructions ?? "Способ приготовления не указан."}</p>
      </div>
    </details>
  );
}

async function Recipes() {
  const { matches, pantrySize } = await getRecipeMatches();

  if (pantrySize === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-tint p-4 text-sm">
        <p>Пока неизвестно, что есть дома.</p>
        <Link href="/pantry" className="font-medium hover:underline">
          Добавить продукты →
        </Link>
      </div>
    );
  }

  const ready = matches.filter((match) => match.canCook);
  const partial = matches.filter((match) => !match.canCook);
  const shown = partial.slice(0, MAX_PARTIAL);

  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Можно приготовить сейчас</h2>
        {ready.length > 0 ? (
          ready.map((match) => <RecipeCard key={match.id} match={match} />)
        ) : (
          <p className="text-sm text-ink-muted">
            Для полного рецепта продуктов пока не хватает.
          </p>
        )}
      </section>

      {shown.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Нужно докупить</h2>
          {shown.map((match) => (
            <RecipeCard key={match.id} match={match} />
          ))}
          {partial.length > shown.length && (
            <p className="text-sm text-ink-muted">
              Показаны {shown.length} самых подходящих из {partial.length}.
            </p>
          )}
        </section>
      )}

      {matches.length === 0 && (
        <p className="text-sm text-ink-muted">
          Ни один рецепт не использует эти продукты.
        </p>
      )}
    </>
  );
}

export default function RecipesPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-ink-muted hover:underline">
            ← Сегодня
          </Link>
          <h1 className="text-2xl font-medium tracking-tight">Рецепты</h1>
        </div>
        <Link
          href="/pantry"
          className="rounded-xl border border-line px-3 py-2 text-sm transition-colors hover:bg-tint"
        >
          Дома
        </Link>
      </header>
      <Suspense fallback={<div className="h-96 rounded-xl bg-tint" />}>
        <Recipes />
      </Suspense>
    </main>
  );
}
