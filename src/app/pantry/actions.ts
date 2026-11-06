"use server";

import { revalidatePath } from "next/cache";

import {
  addToPantry,
  itemExists,
  removeFromPantry,
  setPantryGrams,
} from "@/lib/data";
import { parsePantryGrams } from "@/lib/recipes";

export type PantryFormState = {
  saved: boolean;
  errors: { productId?: string; grams?: string };
};

function readProductId(formData: FormData) {
  const id = Number(formData.get("productId"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function addPantryItemAction(
  _state: PantryFormState,
  formData: FormData,
): Promise<PantryFormState> {
  const productId = readProductId(formData);
  const grams = parsePantryGrams(String(formData.get("grams") ?? ""));

  const errors: PantryFormState["errors"] = {};
  if (productId === null || !itemExists("product", productId)) {
    errors.productId = "Выбери продукт";
  }
  if (grams === null) errors.grams = "Укажи вес от 1 до 100 000 г";

  if (productId === null || grams === null || errors.productId) {
    return { saved: false, errors };
  }

  addToPantry(productId, grams);
  refresh();
  return { saved: true, errors: {} };
}

export async function updatePantryItemAction(formData: FormData) {
  const productId = readProductId(formData);
  const grams = parsePantryGrams(String(formData.get("grams") ?? ""));
  if (productId === null || grams === null) return;

  setPantryGrams(productId, grams);
  refresh();
}

export async function deletePantryItemAction(formData: FormData) {
  const productId = readProductId(formData);
  if (productId === null) return;

  removeFromPantry(productId);
  refresh();
}
