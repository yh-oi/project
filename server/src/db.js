import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data.db');

let db = null;
let SQL = null;

// Wrapper that mimics better-sqlite3 API using sql.js
class Database {
  constructor(sqlDb) {
    this._db = sqlDb;
    this._db.run('PRAGMA foreign_keys = ON');
  }

  exec(sql) {
    this._db.run(sql);
  }

  prepare(sql) {
    return new Statement(this._db, sql);
  }
}

class Statement {
  constructor(db, sql) {
    this._db = db;
    this._sql = sql;
  }

  _bindParams(params) {
    if (!params) return [];
    if (Array.isArray(params)) return params;
    // Named params or positional — convert to positional
    const sql = this._sql;
    const paramNames = [...sql.matchAll(/\?|:(\w+)|@(\w+)|$(\w+)/g)].map(m => m[0]);
    return paramNames.map((name) => {
      if (name === '?') return null; // will be filled in order
      return params[name.slice(1)] ?? params[name] ?? null;
    });
  }

  get(...params) {
    // Handle both positional and named params
    let bindParams = [];
    if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      bindParams = this._bindParams(params[0]);
    } else {
      bindParams = params;
    }

    const stmt = this._db.prepare(this._sql);
    if (bindParams.length > 0) stmt.bind(bindParams);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }

  all(...params) {
    let bindParams = [];
    if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      bindParams = this._bindParams(params[0]);
    } else {
      bindParams = params;
    }

    const stmt = this._db.prepare(this._sql);
    if (bindParams.length > 0) stmt.bind(bindParams);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  run(...params) {
    let bindParams = [];
    if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      bindParams = this._bindParams(params[0]);
    } else {
      bindParams = params;
    }

    const stmt = this._db.prepare(this._sql);
    if (bindParams.length > 0) stmt.bind(bindParams);
    stmt.step();
    stmt.free();

    return {
      lastInsertRowid: this._db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] ?? 0,
      changes: this._db.getRowsModified(),
    };
  }
}

async function getDb() {
  if (db) return db;

  SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = new Database(sqlDb);
  initTables(db);
  return db;
}

function initTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('organizer','participant')) DEFAULT 'participant',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organizer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      time_limit INTEGER DEFAULT 60,
      room_code TEXT UNIQUE,
      status TEXT NOT NULL CHECK(status IN ('draft','active','completed')) DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text','image')),
      choice_type TEXT NOT NULL CHECK(choice_type IN ('single','multiple')),
      content TEXT NOT NULL,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option_ids TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      score INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      UNIQUE(user_id, quiz_id)
    );
  `);
}

// Auto-save database to disk periodically and on process exit
function saveDb() {
  if (!db) return;
  const data = db._db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Save every 30 seconds
setInterval(saveDb, 30000);

// Save on exit
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

export { getDb, saveDb };
