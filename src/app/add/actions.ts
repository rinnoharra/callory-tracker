"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addDiaryEntry, deleteDiaryEntry, itemExists } from "@/lib/data";
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
    item: field("item"),
    grams: field("grams"),
    meal,
  });

  if (!result.ok) return { errors: result.errors, meal };

  const { entry } = result;
  if (!itemExists(entry.kind, entry.itemId)) {
    return { errors: { item: "Такой записи в справочнике больше нет" }, meal };
  }

  addDiaryEntry(entry, new Date());
  revalidatePath("/", "layout");
  redirect("/");
}

export async function deleteEntryAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  deleteDiaryEntry(id);
  revalidatePath("/", "layout");
}
