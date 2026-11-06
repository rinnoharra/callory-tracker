"use client";

import { useActionState } from "react";

import {
  createProductAction,
  type NewProductState,
} from "@/app/products/new/actions";
import {
  FieldError,
  inputClass,
  primaryButtonClass,
} from "@/components/form-fields";
import type { ProductField } from "@/lib/diary";

const initialState: NewProductState = { errors: {} };

const NUMBER_FIELDS: { name: ProductField; label: string }[] = [
  { name: "kcal", label: "Калории, ккал" },
  { name: "protein", label: "Белки, г" },
  { name: "fat", label: "Жиры, г" },
  { name: "carbs", label: "Углеводы, г" },
];

export function ProductForm() {
  const [state, formAction, pending] = useActionState(
    createProductAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm text-ink-muted">
          Название
        </label>
        <input
          id="name"
          name="name"
          placeholder="Сырники"
          autoComplete="off"
          defaultValue={state.values?.name}
          className={inputClass}
        />
        <FieldError message={state.errors.name} />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm text-ink-muted">
          Значения на 100 г, можно взять с упаковки
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {NUMBER_FIELDS.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label htmlFor={field.name} className="text-sm text-ink-muted">
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                inputMode="decimal"
                defaultValue={state.values?.[field.name]}
                className={inputClass}
              />
              <FieldError message={state.errors[field.name]} />
            </div>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Сохраняем…" : "Создать продукт"}
      </button>
    </form>
  );
}
