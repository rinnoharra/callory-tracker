import type { Metadata } from "next";
import Link from "next/link";

import { ProductForm } from "@/components/product-form";

export const metadata: Metadata = { title: "Новый продукт — Трекер калорий" };

export default function NewProductPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header>
        <Link href="/add" className="text-sm text-ink-muted hover:underline">
          ← Добавить еду
        </Link>
        <h1 className="text-2xl font-medium tracking-tight">Новый продукт</h1>
      </header>
      <ProductForm />
    </main>
  );
}
