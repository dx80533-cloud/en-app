/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, jsonb, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const vocabUserPreferences = pgTable("vocab_user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  theme: varchar("theme", { length: 30 }).notNull().default('default'),
  /**
   * @type { soundEnabled?: boolean; autoPlay?: boolean; dailyGoal?: number }
   */
  settings: jsonb("settings"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  // Complex index: CREATE UNIQUE INDEX idx_vocab_user_prefs_unique ON vocab_user_preferences USING btree (((user_id).user_id)),
]);

export const vocabQuizRecords = pgTable("vocab_quiz_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  quizType: varchar("quiz_type", { length: 50 }).notNull(),
  bank: varchar("bank", { length: 50 }).notNull(),
  level: varchar("level", { length: 20 }),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  score: integer("score").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  details: jsonb("details"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const vocabUserStats = pgTable("vocab_user_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakDays: integer("streak_days").notNull().default(0),
  lastStudyDate: date("last_study_date"),
  totalStudied: integer("total_studied").notNull().default(0),
  totalCorrect: integer("total_correct").notNull().default(0),
  totalWrong: integer("total_wrong").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  totalQuizzes: integer("total_quizzes").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Complex index: CREATE UNIQUE INDEX idx_vocab_user_stats_unique ON vocab_user_stats USING btree (((user_id).user_id)),
]);

export const vocabUserProgress = pgTable("vocab_user_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  wordId: uuid("word_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('new'),
  correctCount: integer("correct_count").notNull().default(0),
  wrongCount: integer("wrong_count").notNull().default(0),
  lastReviewedAt: customTimestamptz("last_reviewed_at", { precision: 3 }),
  nextReviewAt: customTimestamptz("next_review_at", { precision: 3 }),
  familiarity: integer("familiarity").notNull().default(0),
  isFavorite: boolean("is_favorite").notNull().default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Complex index: CREATE UNIQUE INDEX idx_vocab_user_progress_unique ON vocab_user_progress USING btree (((user_id).user_id), word_id),
  index("idx_vocab_user_progress_status").on(table.status),
  index("idx_vocab_user_progress_favorite").on(table.isFavorite),
  foreignKey({
    columns: [table.wordId],
    foreignColumns: [vocabWords.id],
    name: "vocab_user_progress_word_id_fkey",
  }).onDelete("cascade"),
]);

export const vocabWords = pgTable("vocab_words", {
  id: uuid("id").primaryKey().defaultRandom(),
  word: varchar("word", { length: 100 }).notNull().unique(),
  display: varchar("display", { length: 100 }).notNull(),
  pos: varchar("pos", { length: 50 }),
  zh: text("zh").notNull(),
  phonetic: varchar("phonetic", { length: 200 }),
  definition: text("definition"),
  frq: integer("frq").default(0),
  note: text("note"),
  academic: varchar("academic", { length: 10 }),
  example: text("example"),
  exampleZh: text("example_zh"),
  banks: text("banks").array().notNull().default([]),
  level: varchar("level", { length: 20 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("vocab_words_word_key").on(table.word),
  index("idx_vocab_words_banks").using("gin", table.banks),
  index("idx_vocab_words_level").on(table.level),
  index("idx_vocab_words_frq").on(table.frq),
]);

// table aliases
export const vocabQuizRecordsTable = vocabQuizRecords;
export const vocabUserPreferencesTable = vocabUserPreferences;
export const vocabUserProgressTable = vocabUserProgress;
export const vocabUserStatsTable = vocabUserStats;
export const vocabWordsTable = vocabWords;
