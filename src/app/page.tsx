import Link from "next/link";
import { Suspense } from "react";

import { deleteEntryAction } from "@/app/add/actions";
import { CalorieRing } from "@/components/calorie-ring";
import { primaryButtonClass } from "@/components/form-fields";
import { MacroStat } from "@/components/macro-stat";
import { getTodaySummary } from "@/lib/data";

async function Today() {
  const summary = await getTodaySummary();

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted first-letter:uppercase">
            {summary.dateLabel}
          </p>
          <h1 className="text-2xl font-medium tracking-tight">Сегодня</h1>
        </div>
        <Link
          href="/settings"
          className="rounded-xl border border-line px-3 py-2 text-sm transition-colors hover:bg-tint"
        >
          Профиль
        </Link>
      </header>

      <nav aria-label="Разделы" className="grid grid-cols-2 gap-2">
        <Link
          href="/pantry"
          className="rounded-xl border border-line px-3 py-2 text-center text-sm transition-colors hover:bg-tint"
        >
          Что есть дома
        </Link>
        <Link
          href="/recipes"
          className="rounded-xl border border-line px-3 py-2 text-center text-sm transition-colors hover:bg-tint"
        >
          Подбор рецептов
        </Link>
      </nav>

      {!summary.hasProfile && (
        <Link
          href="/settings"
          className="rounded-xl bg-tint p-3 text-sm hover:underline"
        >
          Заполни профиль, чтобы рассчитать свою норму калорий →
        </Link>
      )}

      <section aria-label="Калории за день" className="flex flex-col gap-2">
        <CalorieRing eaten={summary.kcal} goal={summary.goal} />
        <p className="text-center text-sm text-ink-muted tabular-nums">
          Съедено {summary.kcal.toLocaleString("ru-RU")} из{" "}
          {summary.goal.toLocaleString("ru-RU")} ккал
        </p>
      </section>

      <section aria-label="Белки, жиры и углеводы" className="grid grid-cols-3 gap-2">
        <MacroStat label="белки" grams={summary.protein} />
        <MacroStat label="жиры" grams={summary.fat} />
        <MacroStat label="углеводы" grams={summary.carbs} />
      </section>

      <section aria-label="Приёмы пищи">
        <ul className="divide-y divide-tint">
          {summary.meals.map((meal) => (
            <li key={meal.id} className="py-3">
              <div className="flex justify-between">
                <span>{meal.label}</span>
                <span className="text-ink-muted tabular-nums">
                  {meal.entries.length > 0 ? `${meal.kcal} ккал` : "—"}
                </span>
              </div>
              {meal.entries.length > 0 && (
                <ul className="mt-1 flex flex-col">
                  {meal.entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-2 text-sm text-ink-muted"
                    >
                      <span className="min-w-0 truncate">
                        {entry.name}, {entry.grams} г
                      </span>
                      <span className="ml-auto shrink-0 tabular-nums">
                        {entry.kcal}
                      </span>
                      <form action={deleteEntryAction}>
                        <input type="hidden" name="id" value={entry.id} />
                        <button
                          type="submit"
                          aria-label={`Удалить: ${entry.name}`}
                          className="flex size-8 items-center justify-center rounded-lg text-lg leading-none transition-colors hover:bg-tint"
                        >
                          ×
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Link href="/add" className={`sticky bottom-4 mt-auto ${primaryButtonClass}`}>
        Добавить еду
      </Link>
    </>
  );
}

function TodaySkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6" aria-label="Загрузка">
      <div className="h-14 w-40 rounded-xl bg-tint" />
      <div className="mx-auto size-52 rounded-full bg-tint" />
      <div className="h-20 rounded-xl bg-tint" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <Suspense fallback={<TodaySkeleton />}>
        <Today />
      </Suspense>
    </main>
  );
}
