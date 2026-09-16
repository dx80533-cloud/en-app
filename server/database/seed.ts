import { existsSync, readFileSync } from 'fs';
import { count } from 'drizzle-orm';
import { vocabWords } from './schema';
import type { VocabDb } from './database.module';

/**
 * Seed vocab_words from a JSON array file (the curated word bank).
 * Idempotent: only inserts when the table is empty.
 */
export async function seedIfEmpty(db: VocabDb, seedPath: string): Promise<number> {
  const totalResult = await db.select({ count: count() }).from(vocabWords);
  const total = Number(totalResult[0]?.count ?? 0);
  if (total > 0) return 0;

  if (!existsSync(seedPath)) {
    throw new Error(`seed file not found: ${seedPath}`);
  }

  const records = JSON.parse(readFileSync(seedPath, 'utf-8')) as Array<{
    word: string;
    display?: string;
    pos?: string;
    zh?: string;
    phonetic?: string;
    definition?: string;
    frq?: number;
    note?: string;
    academic?: string;
    example?: string;
    example_zh?: string;
    banks?: string[];
    level?: string;
  }>;

  let inserted = 0;
  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    db.insert(vocabWords)
      .values(
        batch.map((r) => ({
          word: r.word,
          display: r.display || r.word,
          pos: r.pos || null,
          zh: r.zh || '',
          phonetic: r.phonetic || null,
          definition: r.definition || null,
          frq: r.frq ?? 0,
          note: r.note || null,
          academic: r.academic || null,
          example: r.example || null,
          exampleZh: r.example_zh || null,
          banks: r.banks ?? [],
          level: r.level || null,
        })),
      )
      .run();
    inserted += batch.length;
  }

  return inserted;
}
