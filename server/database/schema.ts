/* eslint-disable */
/**
 * Self-hosted SQLite schema (migrated from platform PostgreSQL schema).
 * Column names/property names are kept identical to the original schema
 * so service-layer code stays compatible.
 */
import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
  foreignKey,
} from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'crypto';

const uuidPk = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID());

const createdAtCol = () =>
  integer('_created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAtCol = () =>
  integer('_updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date());

/* ---------------- users (new, self-hosted auth) ---------------- */
export const users = sqliteTable(
  'users',
  {
    id: uuidPk(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    name: text('name'),
    avatar: text('avatar'),
    provider: text('provider').notNull().default('email'), // 'email' | 'google'
    googleId: text('google_id'),
    createdAt: createdAtCol(),
  },
  (table) => [uniqueIndex('users_email_key').on(table.email)],
);

/* ---------------- vocab_words ---------------- */
export const vocabWords = sqliteTable(
  'vocab_words',
  {
    id: uuidPk(),
    word: text('word', { length: 100 }).notNull(),
    display: text('display', { length: 100 }).notNull(),
    pos: text('pos', { length: 50 }),
    zh: text('zh').notNull(),
    phonetic: text('phonetic', { length: 200 }),
    definition: text('definition'),
    frq: integer('frq').default(0),
    note: text('note'),
    academic: text('academic', { length: 10 }),
    example: text('example'),
    exampleZh: text('example_zh'),
    banks: text('banks', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    level: text('level', { length: 20 }),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex('vocab_words_word_key').on(table.word),
    index('idx_vocab_words_level').on(table.level),
    index('idx_vocab_words_frq').on(table.frq),
  ],
);

/* ---------------- vocab_user_progress ---------------- */
export const vocabUserProgress = sqliteTable(
  'vocab_user_progress',
  {
    id: uuidPk(),
    userId: text('user_id').notNull(),
    wordId: text('word_id').notNull(),
    status: text('status', { length: 20 }).notNull().default('new'),
    correctCount: integer('correct_count').notNull().default(0),
    wrongCount: integer('wrong_count').notNull().default(0),
    lastReviewedAt: integer('last_reviewed_at', { mode: 'timestamp_ms' }),
    nextReviewAt: integer('next_review_at', { mode: 'timestamp_ms' }),
    familiarity: integer('familiarity').notNull().default(0),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex('idx_vocab_user_progress_unique').on(table.userId, table.wordId),
    index('idx_vocab_user_progress_status').on(table.status),
    index('idx_vocab_user_progress_favorite').on(table.isFavorite),
    foreignKey({
      columns: [table.wordId],
      foreignColumns: [vocabWords.id],
      name: 'vocab_user_progress_word_id_fkey',
    }).onDelete('cascade'),
  ],
);

/* ---------------- vocab_user_stats ---------------- */
export const vocabUserStats = sqliteTable(
  'vocab_user_stats',
  {
    id: uuidPk(),
    userId: text('user_id').notNull(),
    xp: integer('xp').notNull().default(0),
    level: integer('level').notNull().default(1),
    streakDays: integer('streak_days').notNull().default(0),
    lastStudyDate: text('last_study_date'),
    totalStudied: integer('total_studied').notNull().default(0),
    totalCorrect: integer('total_correct').notNull().default(0),
    totalWrong: integer('total_wrong').notNull().default(0),
    maxStreak: integer('max_streak').notNull().default(0),
    totalQuizzes: integer('total_quizzes').notNull().default(0),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [uniqueIndex('idx_vocab_user_stats_unique').on(table.userId)],
);

/* ---------------- vocab_quiz_records ---------------- */
export const vocabQuizRecords = sqliteTable('vocab_quiz_records', {
  id: uuidPk(),
  userId: text('user_id').notNull(),
  quizType: text('quiz_type', { length: 50 }).notNull(),
  bank: text('bank', { length: 50 }).notNull(),
  level: text('level', { length: 20 }),
  totalQuestions: integer('total_questions').notNull().default(0),
  correctCount: integer('correct_count').notNull().default(0),
  score: integer('score').notNull().default(0),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  details: text('details', { mode: 'json' }).$type<unknown>(),
  createdAt: createdAtCol(),
});

/* ---------------- vocab_user_preferences ---------------- */
export const vocabUserPreferences = sqliteTable(
  'vocab_user_preferences',
  {
    id: uuidPk(),
    userId: text('user_id').notNull(),
    theme: text('theme', { length: 30 }).notNull().default('default'),
    settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [uniqueIndex('idx_vocab_user_prefs_unique').on(table.userId)],
);

// table aliases (kept for compatibility)
export const vocabQuizRecordsTable = vocabQuizRecords;
export const vocabUserPreferencesTable = vocabUserPreferences;
export const vocabUserProgressTable = vocabUserProgress;
export const vocabUserStatsTable = vocabUserStats;
export const vocabWordsTable = vocabWords;
export const usersTable = users;
