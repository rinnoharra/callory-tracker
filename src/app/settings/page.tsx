import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ProfileForm } from "@/components/profile-form";
import { getProfile } from "@/lib/data";
import { calculateNorm, type Profile } from "@/lib/nutrition";

export const metadata: Metadata = { title: "Профиль — Трекер калорий" };

function Norm({ profile }: { profile: Profile }) {
  const norm = calculateNorm(profile, new Date());

  return (
    <section aria-label="Твоя норма" className="rounded-xl bg-tint p-4">
      <p className="text-sm text-ink-muted">Твоя норма в день</p>
      <p className="text-3xl font-medium tabular-nums">
        {norm.target.toLocaleString("ru-RU")} ккал
      </p>
      <dl className="mt-3 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Базовый обмен</dt>
          <dd className="tabular-nums">
            {norm.bmr.toLocaleString("ru-RU")} ккал
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Чтобы держать вес</dt>
          <dd className="tabular-nums">
            {norm.maintenance.toLocaleString("ru-RU")} ккал
          </dd>
        </div>
      </dl>
      {norm.isRaisedToMinimum && (
        <p className="mt-3 text-sm">
          Расчёт дал слишком мало, поэтому норма поднята до безопасного
          минимума.
        </p>
      )}
    </section>
  );
}

async function Settings() {
  const profile = await getProfile();

  return (
    <>
      {profile && <Norm profile={profile} />}
      <ProfileForm profile={profile} />
      <p className="text-sm text-ink-muted">
        Норма — это оценка по формуле Миффлина — Сан-Жеора, а не медицинская
        рекомендация. При беременности, кормлении грудью или хронических
        заболеваниях лучше обсудить питание с врачом.
      </p>
    </>
  );
}

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header>
        <Link href="/" className="text-sm text-ink-muted hover:underline">
          ← Сегодня
        </Link>
        <h1 className="text-2xl font-medium tracking-tight">Профиль</h1>
      </header>
      <Suspense fallback={<div className="h-96 rounded-xl bg-tint" />}>
        <Settings />
      </Suspense>
    </main>
  );
}
