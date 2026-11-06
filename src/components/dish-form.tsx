"use client";

import { useActionState, useState } from "react";

import {
  createDishAction,
  type NewDishState,
} from "@/app/dishes/new/actions";
import {
  FieldError,
  inputClass,
  primaryButtonClass,
} from "@/components/form-fields";
import { dishNutrition, type CatalogItem, type DishField } from "@/lib/diary";
import { parseNumber } from "@/lib/nutrition";

const initialState: NewDishState = { errors: {} };

const MAX_RESULTS = 20;

type Ingredient = { product: CatalogItem; grams: string };

// Ключ продукта в каталоге выглядит как product:12.
function productIdOf(item: CatalogItem) {
  return Number(item.key.split(":")[1]);
}

export function DishForm({ products }: { products: CatalogItem[] }) {
  const [state, formAction, pending] = useActionState(
    createDishAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [cookedGrams, setCookedGrams] = useState("");
  const [query, setQuery] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  // Поля, изменённые после отправки: их старые ошибки больше не показываем.
  const [edited, setEdited] = useState<DishField[]>([]);

  const errorFor = (field: DishField) =>
    edited.includes(field) ? undefined : state.errors[field];

  function markEdited(field: DishField) {
    setEdited((fields) => [...fields, field]);
  }

  const search = query.trim().toLowerCase();
  const added = new Set(ingredients.map((row) => row.product.key));
  const found = search
    ? products
        .filter(
          (item) =>
            !added.has(item.key) && item.name.toLowerCase().includes(search),
        )
        .slice(0, MAX_RESULTS)
    : [];

  function addIngredient(product: CatalogItem) {
    setIngredients([...ingredients, { product, grams: "100" }]);
    setQuery("");
    markEdited("ingredients");
  }

  function setGrams(key: string, grams: string) {
    markEdited("ingredients");
    setIngredients(
      ingredients.map((row) =>
        row.product.key === key ? { ...row, grams } : row,
      ),
    );
  }

  function removeIngredient(key: string) {
    markEdited("ingredients");
    setIngredients(ingredients.filter((row) => row.product.key !== key));
  }

  const validRows = ingredients
    .map((row) => ({ ...row.product, grams: parseNumber(row.grams) }))
    .filter((row) => row.grams > 0);

  const cooked = parseNumber(cookedGrams);
  const nutrition = dishNutrition(validRows, cooked > 0 ? cooked : null);

  const payload = JSON.stringify(
    ingredients.map((row) => ({
      productId: productIdOf(row.product),
      grams: row.grams,
    })),
  );

  return (
    <form
      action={formAction}
      onSubmit={() => setEdited([])}
      className="flex flex-col gap-5"
      noValidate
    >
      <input type="hidden" name="ingredients" value={payload} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm text-ink-muted">
          Название
        </label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            markEdited("name");
          }}
          placeholder="Плов с курицей"
          autoComplete="off"
          className={inputClass}
        />
        <FieldError message={errorFor("name")} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="search" className="text-sm text-ink-muted">
          Добавить продукт
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Рис"
          autoComplete="off"
          className={inputClass}
        />

        {found.length > 0 && (
          <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto">
            {found.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => addIngredient(item)}
                  className="flex w-full justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-tint"
                >
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                    {item.kcal} ккал
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {search && found.length === 0 && (
          <p className="px-3 py-2 text-sm text-ink-muted">
            Такого продукта нет в справочнике.
          </p>
        )}
      </div>

      {ingredients.length > 0 && (
        <section aria-label="Состав блюда" className="flex flex-col gap-2">
          <p className="text-sm text-ink-muted">Состав, граммы сырого веса</p>
          <ul className="flex flex-col gap-2">
            {ingredients.map((row) => (
              <li key={row.product.key} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {row.product.name}
                </span>
                <input
                  aria-label={`Граммы: ${row.product.name}`}
                  inputMode="decimal"
                  value={row.grams}
                  onChange={(event) =>
                    setGrams(row.product.key, event.target.value)
                  }
                  className={`${inputClass} w-20! text-right tabular-nums`}
                />
                <span className="text-sm text-ink-muted">г</span>
                <button
                  type="button"
                  aria-label={`Убрать: ${row.product.name}`}
                  onClick={() => removeIngredient(row.product.key)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-ink-muted transition-colors hover:bg-tint"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <FieldError message={errorFor("ingredients")} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cookedGrams" className="text-sm text-ink-muted">
          Вес готового блюда, г (необязательно)
        </label>
        <input
          id="cookedGrams"
          name="cookedGrams"
          inputMode="decimal"
          value={cookedGrams}
          onChange={(event) => {
            setCookedGrams(event.target.value);
            markEdited("cookedGrams");
          }}
          placeholder={
            validRows.length > 0
              ? `${Math.round(nutrition.totalGrams)}`
              : undefined
          }
          className={inputClass}
        />
        <p className="text-sm text-ink-muted">
          При варке вес меняется. Взвесь готовое блюдо, и расчёт будет точнее.
        </p>
        <FieldError message={errorFor("cookedGrams")} />
      </div>

      {validRows.length > 0 && (
        <section
          aria-label="Калорийность блюда"
          className="rounded-xl bg-tint p-3 text-sm tabular-nums"
        >
          <p className="text-base font-medium">
            {Math.round(nutrition.kcal)} ккал на 100 г
          </p>
          <p>
            Белки {nutrition.protein.toFixed(1)} г, жиры{" "}
            {nutrition.fat.toFixed(1)} г, углеводы {nutrition.carbs.toFixed(1)} г
          </p>
          <p className="text-ink-muted">
            Всё блюдо: {Math.round(nutrition.totalGrams)} г,{" "}
            {Math.round(nutrition.totalKcal)} ккал
          </p>
        </section>
      )}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Сохраняем…" : "Создать блюдо"}
      </button>
    </form>
  );
}
