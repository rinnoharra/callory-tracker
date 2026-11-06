import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

// Каждая строка — одна миграция. Уже применённые миграции не меняем:
// чтобы изменить схему, добавляем новый элемент в конец массива.
const MIGRATIONS = [
  `
  CREATE TABLE products (
    id      INTEGER PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    kcal    REAL NOT NULL CHECK (kcal >= 0),
    protein REAL NOT NULL CHECK (protein >= 0),
    fat     REAL NOT NULL CHECK (fat >= 0),
    carbs   REAL NOT NULL CHECK (carbs >= 0)
  );

  CREATE TABLE pantry_items (
    id         INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products (id) ON DELETE CASCADE,
    grams      REAL NOT NULL CHECK (grams >= 0),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE diary_entries (
    id         INTEGER PRIMARY KEY,
    eaten_on   TEXT NOT NULL,
    meal       TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
    product_id INTEGER NOT NULL REFERENCES products (id),
    grams      REAL NOT NULL CHECK (grams > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX diary_entries_eaten_on ON diary_entries (eaten_on);
  `,
  `
  CREATE TABLE profile (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    sex        TEXT NOT NULL CHECK (sex IN ('female', 'male')),
    birth_date TEXT NOT NULL,
    height_cm  REAL NOT NULL CHECK (height_cm > 0),
    weight_kg  REAL NOT NULL CHECK (weight_kg > 0),
    activity   TEXT NOT NULL,
    goal       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
];

// Примерные значения на 100 г: name, kcal, protein, fat, carbs.
const SEED_PRODUCTS: [string, number, number, number, number][] = [
  ["Куриная грудка", 113, 23.6, 1.9, 0.4],
  ["Яйцо куриное", 157, 12.7, 11.5, 0.7],
  ["Гречка сухая", 343, 13.3, 3.4, 62.1],
  ["Рис белый сухой", 344, 6.7, 0.7, 78.9],
  ["Овсяные хлопья", 366, 11.9, 7.2, 69.3],
  ["Творог 5%", 121, 17.2, 5, 1.8],
  ["Банан", 96, 1.5, 0.2, 21],
  ["Яблоко", 47, 0.4, 0.4, 9.8],
];

function migrate(db: DatabaseSync) {
  const { user_version: version } = db
    .prepare("PRAGMA user_version")
    .get() as { user_version: number };

  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

function seed(db: DatabaseSync) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO products (name, kcal, protein, fat, carbs)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM products")
    .get() as { count: number };

  if (count === 0) {
    for (const product of SEED_PRODUCTS) insert.run(...product);
  }
}

function connect() {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  return db;
}

// Храним подключение в globalThis, чтобы горячая перезагрузка в режиме
// разработки не открывала новое подключение при каждом изменении кода.
const globalForDb = globalThis as typeof globalThis & { db?: DatabaseSync };

// Этот флаг живёт в модуле, а не в globalThis: при горячей перезагрузке он
// сбрасывается, и новые миграции применяются без перезапуска сервера.
let isReady = false;

export function getDb() {
  globalForDb.db ??= connect();
  const db = globalForDb.db;

  if (!isReady) {
    migrate(db);
    seed(db);
    isReady = true;
  }

  return db;
}
