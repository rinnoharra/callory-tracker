"use server";

import { revalidatePath } from "next/cache";

import { saveProfile } from "@/lib/data";
import {
  parseProfile,
  type ProfileErrors,
  type ProfileField,
} from "@/lib/nutrition";

export type ProfileFormState = {
  saved: boolean;
  errors: ProfileErrors;
  values?: Record<ProfileField, string>;
};

export async function saveProfileAction(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const field = (name: ProfileField) => String(formData.get(name) ?? "");
  const values = {
    sex: field("sex"),
    birthDate: field("birthDate"),
    heightCm: field("heightCm"),
    weightKg: field("weightKg"),
    activity: field("activity"),
    goal: field("goal"),
  };

  const result = parseProfile(values, new Date());
  if (!result.ok) {
    return { saved: false, errors: result.errors, values };
  }

  saveProfile(result.profile);
  revalidatePath("/", "layout");
  return { saved: true, errors: {} };
}
