"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { addEntryAction, type AddEntryState } from "@/app/add/actions";
import {
  Choice,
  FieldError,
  inputClass,
  primaryButtonClass,
} from "@/components/form-fields";
import { amountFor, MEALS, type CatalogItem, type MealId } from "@/lib/diary";
import { parseNumber } from "@/lib/nutrition";

const initialState: AddEntryState = { errors: {} };

type AddFoodFormProps = {
  items: CatalogItem[];
  categories: { id: string; label: string }[];
  defaultMeal: MealId;
};

export function AddFoodForm({
  items,
  categories,
  defaultMeal,
}: AddFoodFormProps) {
  const [state, formAction, pending] = useActionState(
    addEntryAction,
    initialState,
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [grams, setGrams] = useState("100");

  const search = query.trim().toLowerCase();
  const found = items.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      item.name.toLowerCase().includes(search),
  );

  const selected = items.find((item) => item.key === selectedKey);
  const portion = parseNumber(grams);
  const hasPreview = selected && portion > 0;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="item" value={selectedKey ?? ""} />

      <div className="flex flex-col gap-2">
        <label htmlFor="search" className="text-sm text-ink-muted">
          Продукт или блюдо
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Гречка"
          autoComplete="off"
          className={inputClass}
        />
        <select
          aria-label="Категория"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={inputClass}
        >
          <option value="all">Все категории</option>
          {categories.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        {found.length > 0 ? (
          <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
            {found.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  aria-pressed={item.key === selectedKey}
                  onClick={() => setSelectedKey(item.key)}
                  className="flex w-full justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-colors hover:bg-tint aria-pressed:border-brand aria-pressed:bg-tint"
                >
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                    {item.kcal} ккал
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-2 text-sm text-ink-muted">
            Здесь такого пока нет.
          </p>
        )}

        {!selected && <FieldError message={state.errors.item} />}
        <Link
          href="/products/new"
          className="text-sm text-ink-muted hover:underline"
        >
          Создать свой продукт →
        </Link>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="grams" className="text-sm text-ink-muted">
          Порция, г
        </label>
        <input
          id="grams"
          name="grams"
          inputMode="decimal"
          value={grams}
          onChange={(event) => setGrams(event.target.value)}
          className={inputClass}
        />
        <FieldError message={state.errors.grams} />
      </div>

      <Choice
        legend="Приём пищи"
        name="meal"
        options={MEALS}
        value={state.meal ?? defaultMeal}
        error={state.errors.meal}
      />

      {hasPreview && (
        <div className="flex flex-col gap-1 rounded-xl bg-tint p-3 text-sm">
          <p className="tabular-nums">
            {selected.name}: {Math.round(amountFor(selected.kcal, portion))}{" "}
            ккал, белки {Math.round(amountFor(selected.protein, portion))} г,
            жиры {Math.round(amountFor(selected.fat, portion))} г, углеводы{" "}
            {Math.round(amountFor(selected.carbs, portion))} г
          </p>
          {selected.composition && (
            <p className="text-ink-muted">Состав: {selected.composition}</p>
          )}
        </div>
      )}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Добавляем…" : "Добавить"}
      </button>
    </form>
  );
}
