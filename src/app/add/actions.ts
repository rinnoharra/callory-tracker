"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addDiaryEntry, deleteDiaryEntry, productExists } from "@/lib/data";
import { parseEntry, type EntryErrors, type EntryField } from "@/lib/diary";

export type AddEntryState = {
  errors: EntryErrors;
  meal?: string;
};

export async function addEntryAction(
  _state: AddEntryState,
  formData: FormData,
): Promise<AddEntryState> {
  const field = (name: EntryField) => String(formData.get(name) ?? "");
  const meal = field("meal");

  const result = parseEntry({
    productId: field("productId"),
    grams: field("grams"),
    meal,
  });

  if (!result.ok) return { errors: result.errors, meal };

  if (!productExists(result.entry.productId)) {
    return { errors: { productId: "Такого продукта больше нет" }, meal };
  }

  addDiaryEntry(result.entry, new Date());
  revalidatePath("/", "layout");
  redirect("/");
}

export async function deleteEntryAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  deleteDiaryEntry(id);
  revalidatePath("/", "layout");
}
