import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { migrate, seedCatalog } from "@/lib/migrations";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

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
    seedCatalog(db);
    isReady = true;
  }

  return db;
}
