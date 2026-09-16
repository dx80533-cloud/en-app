import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type VocabDb } from '../../database/database.module';
import { eq, or, isNull, sql } from 'drizzle-orm';
import { vocabWords } from '../../database/schema';

interface FillOptions {
  limit: number;
  dryRun: boolean;
}

interface DictionaryEntry {
  meanings?: Array<{
    definitions?: Array<{
      definition?: string;
      example?: string;
    }>;
  }>;
}

@Injectable()
export class ExampleFillerService {
  private readonly logger = new Logger(ExampleFillerService.name);
  private readonly DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: VocabDb,
  ) {}

  async fillMissingExamples(
    options: FillOptions,
  ): Promise<{ filled: number; totalMissing: number }> {
    const { limit: rawLimit, dryRun } = options;
    const safeLimit = Math.min(200, Math.max(1, rawLimit));

    const missingWords = await this.db
      .select({ id: vocabWords.id, word: vocabWords.word })
      .from(vocabWords)
      .where(
        or(
          isNull(vocabWords.example),
          sql`${vocabWords.example} = ''`,
        ),
      )
      .limit(safeLimit);

    const totalMissing = await this.getTotalMissing();

    if (dryRun) {
      this.logger.log(
        `dryRun: 找到 ${totalMissing} 個缺例句的單字，本次會處理 ${missingWords.length} 個`,
      );
      return { filled: 0, totalMissing };
    }

    let filled = 0;

    for (const w of missingWords) {
      try {
        const example = await this.fetchExample(w.word);
        if (example) {
          await this.db
            .update(vocabWords)
            .set({
              example,
              exampleZh: '',
            })
            .where(eq(vocabWords.id, w.id));
          filled += 1;
          this.logger.log(`已補齊例句: ${w.word}`);
        } else {
          this.logger.log(`無例句可用: ${w.word}`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`抓取例句失敗 ${w.word}: ${message}`);
      }
    }

    this.logger.log(`例句補齊完成: filled=${filled}/${missingWords.length}`);

    return { filled, totalMissing };
  }

  private async getTotalMissing(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(vocabWords)
      .where(
        or(
          isNull(vocabWords.example),
          sql`${vocabWords.example} = ''`,
        ),
      );
    return Number(result[0]?.count ?? 0);
  }

  private async fetchExample(word: string): Promise<string | null> {
    const url = `${this.DICTIONARY_API_BASE}/${encodeURIComponent(word)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as DictionaryEntry[];
      return this.extractFirstExample(data);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private extractFirstExample(data: DictionaryEntry[]): string | null {
    for (const entry of data) {
      if (!entry.meanings) continue;
      for (const meaning of entry.meanings) {
        if (!meaning.definitions) continue;
        for (const def of meaning.definitions) {
          if (def.example && def.example.trim().length > 0) {
            return def.example.trim();
          }
        }
      }
    }
    return null;
  }
}
