import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateBmr,
  calculateNorm,
  getAge,
  parseProfile,
  type Profile,
} from "./nutrition.ts";

const NOW = new Date(2026, 10, 6);

const profile: Profile = {
  sex: "male",
  birthDate: "1996-01-15",
  heightCm: 180,
  weightKg: 80,
  activity: "moderate",
  goal: "maintain",
};

const raw = {
  sex: "male",
  birthDate: "1996-01-15",
  heightCm: "180",
  weightKg: "80",
  activity: "moderate",
  goal: "maintain",
};

test("возраст учитывает, был ли день рождения в этом году", () => {
  assert.equal(getAge("1996-11-06", NOW), 30);
  assert.equal(getAge("1996-11-07", NOW), 29);
  assert.equal(getAge("1996-12-01", NOW), 29);
});

test("базовый обмен считается по формуле Миффлина — Сан-Жеора", () => {
  assert.equal(calculateBmr("male", 30, 180, 80), 1780);
  assert.equal(calculateBmr("female", 30, 165, 60), 1320.25);
});

test("норма учитывает активность и цель", () => {
  const maintain = calculateNorm(profile, NOW);
  assert.equal(maintain.bmr, 1780);
  assert.equal(maintain.target, 2760);

  assert.equal(calculateNorm({ ...profile, goal: "lose" }, NOW).target, 2350);
  assert.equal(calculateNorm({ ...profile, goal: "gain" }, NOW).target, 3030);
});

test("норма не опускается ниже минимума", () => {
  const norm = calculateNorm(
    {
      sex: "female",
      birthDate: "1956-01-15",
      heightCm: 150,
      weightKg: 45,
      activity: "sedentary",
      goal: "lose",
    },
    NOW,
  );

  assert.equal(norm.target, 1200);
  assert.equal(norm.isRaisedToMinimum, true);
});

test("проверка формы принимает верные данные и запятую в весе", () => {
  const result = parseProfile({ ...raw, weightKg: "72,5" }, NOW);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.profile.weightKg, 72.5);
});

test("проверка формы отклоняет неверные данные", () => {
  const result = parseProfile(
    {
      sex: "",
      birthDate: "2015-02-31",
      heightCm: "abc",
      weightKg: "",
      activity: "sofa",
      goal: "",
    },
    NOW,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(Object.keys(result.errors).sort(), [
      "activity",
      "birthDate",
      "goal",
      "heightCm",
      "sex",
      "weightKg",
    ]);
  }
});

test("проверка формы не пропускает несовершеннолетних", () => {
  const result = parseProfile({ ...raw, birthDate: "2010-01-01" }, NOW);
  assert.equal(result.ok, false);
});
