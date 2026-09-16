import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { seedIfEmpty } from './seed';

export const DRIZZLE_DATABASE = 'DRIZZLE_DATABASE';
export type VocabDb = BetterSQLite3Database<typeof schema>;

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT,
  avatar TEXT,
  provider TEXT NOT NULL DEFAULT 'email',
  google_id TEXT,
  _created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vocab_words (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  display TEXT NOT NULL,
  pos TEXT,
  zh TEXT NOT NULL,
  phonetic TEXT,
  definition TEXT,
  frq INTEGER DEFAULT 0,
  note TEXT,
  academic TEXT,
  example TEXT,
  example_zh TEXT,
  banks TEXT NOT NULL DEFAULT '[]',
  level TEXT,
  _created_at INTEGER NOT NULL,
  _updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vocab_words_level ON vocab_words(level);
CREATE INDEX IF NOT EXISTS idx_vocab_words_frq ON vocab_words(frq);
CREATE TABLE IF NOT EXISTS vocab_user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  word_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at INTEGER,
  next_review_at INTEGER,
  familiarity INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  _created_at INTEGER NOT NULL,
  _updated_at INTEGER NOT NULL,
  UNIQUE (user_id, word_id),
  FOREIGN KEY (word_id) REFERENCES vocab_words(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vocab_user_progress_status ON vocab_user_progress(status);
CREATE INDEX IF NOT EXISTS idx_vocab_user_progress_favorite ON vocab_user_progress(is_favorite);
CREATE TABLE IF NOT EXISTS vocab_user_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_study_date TEXT,
  total_studied INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_wrong INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  total_quizzes INTEGER NOT NULL DEFAULT 0,
  _created_at INTEGER NOT NULL,
  _updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vocab_quiz_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  quiz_type TEXT NOT NULL,
  bank TEXT NOT NULL,
  level TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  _created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vocab_user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  theme TEXT NOT NULL DEFAULT 'default',
  settings TEXT,
  _created_at INTEGER NOT NULL,
  _updated_at INTEGER NOT NULL
);
`;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): VocabDb => {
        const logger = new Logger('DatabaseModule');
        const dbPath =
          config.get<string>('DB_PATH') || 'data/vocab.db';
        mkdirSync(dirname(dbPath), { recursive: true });

        const sqlite = new Database(dbPath);
        sqlite.pragma('journal_mode = WAL');
        sqlite.pragma('foreign_keys = ON');
        sqlite.exec(CREATE_TABLES);

        const db = drizzle(sqlite, { schema }) as VocabDb;
        logger.log(`SQLite database ready at ${dbPath}`);

        // seed word bank on first boot (idempotent)
        try {
          void seedIfEmpty(db, config.get<string>('SEED_PATH') || 'data/wordbank.json');
        } catch (err) {
          logger.warn(`seed skipped: ${err instanceof Error ? err.message : err}`);
        }

        return db;
      },
    },
  ],
  exports: [DRIZZLE_DATABASE],
})
export class DatabaseModule {}
