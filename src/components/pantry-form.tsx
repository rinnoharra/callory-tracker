"use client";

import { useActionState, useState } from "react";

import {
  addPantryItemAction,
  type PantryFormState,
} from "@/app/pantry/actions";
import {
  FieldError,
  inputClass,
  primaryButtonClass,
} from "@/components/form-fields";
import type { CatalogItem } from "@/lib/diary";

const initialState: PantryFormState = { saved: false, errors: {} };

const MAX_RESULTS = 20;

export function PantryForm({ products }: { products: CatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [grams, setGrams] = useState("");

  const [state, formAction, pending] = useActionState(
    async (previous: PantryFormState, formData: FormData) => {
      const result = await addPantryItemAction(previous, formData);
      if (result.saved) {
        setSelected(null);
        setGrams("");
      }
      return result;
    },
    initialState,
  );

  const search = query.trim().toLowerCase();
  const found = search
    ? products
        .filter((item) => item.name.toLowerCase().includes(search))
        .slice(0, MAX_RESULTS)
    : [];

  function choose(item: CatalogItem) {
    setSelected(item);
    setQuery("");
  }

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input
        type="hidden"
        name="productId"
        value={selected ? selected.key.split(":")[1] : ""}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="search" className="text-sm text-ink-muted">
          Добавить продукт
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Картофель"
          autoComplete="off"
          className={inputClass}
        />

        {found.length > 0 && (
          <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto">
            {found.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => choose(item)}
                  className="w-full truncate rounded-xl px-3 py-2 text-left transition-colors hover:bg-tint"
                >
                  {item.name}
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

      {selected && (
        <p className="rounded-xl bg-tint px-3 py-2 text-sm">
          Выбрано: {selected.name}
        </p>
      )}
      {!selected && <FieldError message={state.errors.productId} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="grams" className="text-sm text-ink-muted">
          Сколько есть, г
        </label>
        <input
          id="grams"
          name="grams"
          inputMode="decimal"
          value={grams}
          onChange={(event) => setGrams(event.target.value)}
          placeholder="500"
          className={inputClass}
        />
        <FieldError message={state.errors.grams} />
      </div>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Добавляем…" : "Добавить"}
      </button>
    </form>
  );
}
