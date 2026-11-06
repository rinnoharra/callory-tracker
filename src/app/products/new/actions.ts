"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createProduct, productNameTaken } from "@/lib/data";
import {
  parseNewProduct,
  type ProductErrors,
  type ProductField,
} from "@/lib/diary";

export type NewProductState = {
  errors: ProductErrors;
  values?: Record<ProductField, string>;
};

export async function createProductAction(
  _state: NewProductState,
  formData: FormData,
): Promise<NewProductState> {
  const field = (name: ProductField) => String(formData.get(name) ?? "");
  const values = {
    name: field("name"),
    kcal: field("kcal"),
    protein: field("protein"),
    fat: field("fat"),
    carbs: field("carbs"),
  };

  const result = parseNewProduct(values);
  if (!result.ok) return { errors: result.errors, values };

  if (productNameTaken(result.product.name)) {
    return { errors: { name: "Такой продукт уже есть" }, values };
  }

  createProduct(result.product);
  revalidatePath("/", "layout");
  redirect("/add");
}
