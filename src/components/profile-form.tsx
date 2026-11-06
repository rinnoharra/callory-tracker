"use client";

import { useActionState } from "react";

import {
  saveProfileAction,
  type ProfileFormState,
} from "@/app/settings/actions";
import {
  Choice,
  FieldError,
  inputClass,
  primaryButtonClass,
} from "@/components/form-fields";
import {
  ACTIVITY_LEVELS,
  SEXES,
  WEIGHT_GOALS,
  type Profile,
} from "@/lib/nutrition";

const initialState: ProfileFormState = { saved: false, errors: {} };

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, pending] = useActionState(
    saveProfileAction,
    initialState,
  );

  // После ошибки показываем то, что ввёл пользователь, а не сохранённое.
  const values = state.values ?? profile;
  const { errors } = state;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Choice
        legend="Пол"
        name="sex"
        options={SEXES}
        value={values?.sex}
        error={errors.sex}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="birthDate" className="text-sm text-ink-muted">
          Дата рождения
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          defaultValue={values?.birthDate}
          className={inputClass}
        />
        <FieldError message={errors.birthDate} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="heightCm" className="text-sm text-ink-muted">
            Рост, см
          </label>
          <input
            id="heightCm"
            name="heightCm"
            inputMode="numeric"
            placeholder="170"
            defaultValue={values?.heightCm}
            className={inputClass}
          />
          <FieldError message={errors.heightCm} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="weightKg" className="text-sm text-ink-muted">
            Вес, кг
          </label>
          <input
            id="weightKg"
            name="weightKg"
            inputMode="decimal"
            placeholder="70"
            defaultValue={values?.weightKg}
            className={inputClass}
          />
          <FieldError message={errors.weightKg} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="activity" className="text-sm text-ink-muted">
          Активность
        </label>
        <select
          id="activity"
          name="activity"
          defaultValue={values?.activity ?? "light"}
          className={inputClass}
        >
          {ACTIVITY_LEVELS.map((level) => (
            <option key={level.id} value={level.id}>
              {level.label}
            </option>
          ))}
        </select>
        <FieldError message={errors.activity} />
      </div>

      <Choice
        legend="Цель"
        name="goal"
        options={WEIGHT_GOALS}
        value={values?.goal}
        error={errors.goal}
      />

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Сохраняем…" : "Сохранить"}
      </button>
      <p aria-live="polite" className="text-center text-sm text-ink-muted">
        {state.saved ? "Сохранено" : ""}
      </p>
    </form>
  );
}
