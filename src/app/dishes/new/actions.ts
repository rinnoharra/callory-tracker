"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createDish, dishNameTaken, productsExist } from "@/lib/data";
import { parseNewDish, type DishErrors, type DishField } from "@/lib/diary";

export type NewDishState = {
  errors: DishErrors;
};

export async function createDishAction(
  _state: NewDishState,
  formData: FormData,
): Promise<NewDishState> {
  const field = (name: DishField) => String(formData.get(name) ?? "");

  const result = parseNewDish({
    name: field("name"),
    cookedGrams: field("cookedGrams"),
    ingredients: field("ingredients"),
  });

  if (!result.ok) return { errors: result.errors };

  const { dish } = result;

  if (dishNameTaken(dish.name)) {
    return { errors: { name: "Такое блюдо уже есть" } };
  }

  if (!productsExist(dish.ingredients.map((row) => row.productId))) {
    return { errors: { ingredients: "Какого-то продукта больше нет" } };
  }

  createDish(dish);
  revalidatePath("/", "layout");
  redirect("/add");
}
