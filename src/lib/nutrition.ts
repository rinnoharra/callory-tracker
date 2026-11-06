export const SEXES = [
  { id: "female", label: "Женский" },
  { id: "male", label: "Мужской" },
] as const;

export const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Сидячая, без тренировок", factor: 1.2 },
  { id: "light", label: "Лёгкая, 1–3 раза в неделю", factor: 1.375 },
  { id: "moderate", label: "Средняя, 3–5 раз в неделю", factor: 1.55 },
  { id: "high", label: "Высокая, 6–7 раз в неделю", factor: 1.725 },
  { id: "extreme", label: "Очень высокая, тяжёлый труд", factor: 1.9 },
] as const;

export const WEIGHT_GOALS = [
  { id: "lose", label: "Снизить вес", factor: 0.85 },
  { id: "maintain", label: "Держать вес", factor: 1 },
  { id: "gain", label: "Набрать вес", factor: 1.1 },
] as const;

export type Sex = (typeof SEXES)[number]["id"];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]["id"];
export type WeightGoal = (typeof WEIGHT_GOALS)[number]["id"];

export type Profile = {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: WeightGoal;
};

export type ProfileField = keyof Profile;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

// Ниже этого уровня норму не опускаем, даже если цель — снизить вес.
const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };

export function getAge(birthDate: string, now: Date) {
  const [year, month, day] = birthDate.split("-").map(Number);
  const hadBirthday =
    now.getMonth() + 1 > month ||
    (now.getMonth() + 1 === month && now.getDate() >= day);

  return now.getFullYear() - year - (hadBirthday ? 0 : 1);
}

// Формула Миффлина — Сан-Жеора: сколько тело тратит в полном покое.
export function calculateBmr(
  sex: Sex,
  age: number,
  heightCm: number,
  weightKg: number,
) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return base + (sex === "male" ? 5 : -161);
}

function roundToTen(value: number) {
  return Math.round(value / 10) * 10;
}

export function calculateNorm(profile: Profile, now: Date) {
  const age = getAge(profile.birthDate, now);
  const bmr = calculateBmr(
    profile.sex,
    age,
    profile.heightCm,
    profile.weightKg,
  );
  const activity = ACTIVITY_LEVELS.find((a) => a.id === profile.activity)!;
  const goal = WEIGHT_GOALS.find((g) => g.id === profile.goal)!;

  const maintenance = bmr * activity.factor;
  const target = roundToTen(maintenance * goal.factor);
  const minimum = MIN_KCAL[profile.sex];

  return {
    age,
    bmr: Math.round(bmr),
    maintenance: roundToTen(maintenance),
    target: Math.max(target, minimum),
    isRaisedToMinimum: target < minimum,
  };
}

function parseNumber(value: string) {
  const text = value.trim().replace(",", ".");
  return text === "" ? NaN : Number(text);
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

type ParseResult =
  | { ok: true; profile: Profile }
  | { ok: false; errors: ProfileErrors };

export function parseProfile(
  raw: Record<ProfileField, string>,
  now: Date,
): ParseResult {
  const errors: ProfileErrors = {};

  const sex = SEXES.find((s) => s.id === raw.sex)?.id;
  if (!sex) errors.sex = "Выбери пол";

  if (!isRealDate(raw.birthDate)) {
    errors.birthDate = "Укажи дату рождения";
  } else {
    const age = getAge(raw.birthDate, now);
    if (age < 18) errors.birthDate = "Формула рассчитана на взрослых, от 18 лет";
    else if (age > 100) errors.birthDate = "Проверь год рождения";
  }

  const heightCm = parseNumber(raw.heightCm);
  if (!(heightCm >= 120 && heightCm <= 230)) {
    errors.heightCm = "Укажи рост от 120 до 230 см";
  }

  const weightKg = parseNumber(raw.weightKg);
  if (!(weightKg >= 35 && weightKg <= 300)) {
    errors.weightKg = "Укажи вес от 35 до 300 кг";
  }

  const activity = ACTIVITY_LEVELS.find((a) => a.id === raw.activity)?.id;
  if (!activity) errors.activity = "Выбери уровень активности";

  const goal = WEIGHT_GOALS.find((g) => g.id === raw.goal)?.id;
  if (!goal) errors.goal = "Выбери цель";

  if (!sex || !activity || !goal || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    profile: {
      sex,
      birthDate: raw.birthDate,
      heightCm,
      weightKg,
      activity,
      goal,
    },
  };
}
