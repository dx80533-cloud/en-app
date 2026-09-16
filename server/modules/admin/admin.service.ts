import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, count, ilike, or, desc, asc } from 'drizzle-orm';
import { vocabWords } from '@server/database/schema';
import type { VocabWord, ImportResult, WordListResponse } from '@shared/api.interface';

type WordInsert = typeof vocabWords.$inferInsert;
type WordRow = typeof vocabWords.$inferSelect;

interface CreateWordInput {
  word: string;
  display?: string;
  pos?: string;
  zh: string;
  phonetic?: string;
  definition?: string;
  frq?: number;
  note?: string;
  academic?: string;
  example?: string;
  exampleZh?: string;
  banks?: string[];
  level?: string;
}

interface UpdateWordInput {
  word?: string;
  display?: string;
  pos?: string;
  zh?: string;
  phonetic?: string;
  definition?: string;
  frq?: number;
  note?: string;
  academic?: string;
  example?: string;
  exampleZh?: string;
  banks?: string[];
  level?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async listWords(params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<WordListResponse> {
    const { page, pageSize: rawPageSize, search } = params;
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, rawPageSize));
    const offset = (safePage - 1) * safePageSize;

    const where = search
      ? or(ilike(vocabWords.word, `%${search}%`), ilike(vocabWords.zh, `%${search}%`))
      : undefined;

    const baseQuery = this.db.select().from(vocabWords);
    const query = where ? baseQuery.where(where) : baseQuery;
    const rows: WordRow[] = await query
      .orderBy(asc(vocabWords.word))
      .limit(safePageSize)
      .offset(offset);

    const countBase = this.db.select({ count: count() }).from(vocabWords);
    const countQuery = where ? countBase.where(where) : countBase;
    const totalResult = await countQuery;
    const total = Number(totalResult[0]?.count ?? 0);

    const items: VocabWord[] = rows.map((row: WordRow) => this.mapRowToVocabWord(row));

    return {
      items: items as unknown as WordListResponse['items'],
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async createWord(input: CreateWordInput, userId: string): Promise<VocabWord> {
    if (!input.word || !input.zh) {
      throw new BadRequestException('word 與 zh 為必填欄位');
    }

    const values: WordInsert = {
      word: input.word.trim(),
      display: input.display?.trim() || input.word.trim(),
      pos: input.pos?.trim() || null,
      zh: input.zh.trim(),
      phonetic: input.phonetic?.trim() || null,
      definition: input.definition?.trim() || null,
      frq: input.frq ?? 0,
      note: input.note?.trim() || null,
      academic: input.academic?.trim() || null,
      example: input.example?.trim() || null,
      exampleZh: input.exampleZh?.trim() || null,
      banks: input.banks ?? [],
      level: input.level?.trim() || null,
      createdBy: userId,
      updatedBy: userId,
    };

    const rows = await this.db
      .insert(vocabWords)
      .values(values)
      .returning();

    return this.mapRowToVocabWord(rows[0]);
  }

  async updateWord(
    id: string,
    input: UpdateWordInput,
    userId: string,
  ): Promise<VocabWord> {
    const patch: Partial<WordInsert> = {};

    if (input.word !== undefined) patch.word = input.word.trim();
    if (input.display !== undefined) patch.display = input.display.trim();
    if (input.pos !== undefined) patch.pos = input.pos.trim() || null;
    if (input.zh !== undefined) patch.zh = input.zh.trim();
    if (input.phonetic !== undefined) patch.phonetic = input.phonetic.trim() || null;
    if (input.definition !== undefined) patch.definition = input.definition.trim() || null;
    if (input.frq !== undefined) patch.frq = input.frq;
    if (input.note !== undefined) patch.note = input.note.trim() || null;
    if (input.academic !== undefined) patch.academic = input.academic.trim() || null;
    if (input.example !== undefined) patch.example = input.example.trim() || null;
    if (input.exampleZh !== undefined) patch.exampleZh = input.exampleZh.trim() || null;
    if (input.banks !== undefined) patch.banks = input.banks;
    if (input.level !== undefined) patch.level = input.level.trim() || null;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新欄位');
    }

    patch.updatedBy = userId;

    const updated = await this.db
      .update(vocabWords)
      .set(patch)
      .where(eq(vocabWords.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('單字不存在');
    }

    return this.mapRowToVocabWord(updated[0]);
  }

  async deleteWord(id: string): Promise<{ success: true }> {
    const deleted = await this.db
      .delete(vocabWords)
      .where(eq(vocabWords.id, id))
      .returning({ id: vocabWords.id });

    if (deleted.length === 0) {
      throw new NotFoundException('單字不存在');
    }

    return { success: true };
  }

  async importWords(
    buffer: Buffer,
    format: 'json' | 'csv',
    userId: string,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      updated: 0,
      total: 0,
      errors: [],
    };

    let records: Array<Record<string, unknown>> = [];

    try {
      if (format === 'json') {
        const parsed = JSON.parse(buffer.toString('utf-8'));
        if (!Array.isArray(parsed)) {
          throw new Error('JSON 必須是陣列格式');
        }
        records = parsed;
      } else {
        records = this.parseCsv(buffer.toString('utf-8'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`解析失敗: ${message}`);
      return result;
    }

    result.total = records.length;

    for (let i = 0; i < records.length; i += 1) {
      const record = records[i];
      const lineNum = i + 2; // 1-indexed + header
      try {
        const word = this.normalizeRecord(record, format);
        if (!word.word) {
          result.skipped += 1;
          result.errors.push(`第 ${lineNum} 行: word 為空，已跳過`);
          continue;
        }

        const existing = await this.db
          .select()
          .from(vocabWords)
          .where(eq(vocabWords.word, word.word))
          .limit(1);

        if (existing.length > 0) {
          // upsert: update non-empty fields
          const patch: Partial<WordInsert> = {};
          if (word.display && !existing[0].display) patch.display = word.display;
          if (word.pos && !existing[0].pos) patch.pos = word.pos;
          if (word.zh && !existing[0].zh) patch.zh = word.zh;
          if (word.phonetic && !existing[0].phonetic) patch.phonetic = word.phonetic;
          if (word.definition && !existing[0].definition) patch.definition = word.definition;
          if (word.frq !== undefined && (existing[0].frq === null || existing[0].frq === 0)) {
            patch.frq = word.frq;
          }
          if (word.note && !existing[0].note) patch.note = word.note;
          if (word.academic && !existing[0].academic) patch.academic = word.academic;
          if (word.example && !existing[0].example) patch.example = word.example;
          if (word.exampleZh && !existing[0].exampleZh) patch.exampleZh = word.exampleZh;
          if (word.banks && word.banks.length > 0 && (!existing[0].banks || existing[0].banks.length === 0)) {
            patch.banks = word.banks;
          }
          if (word.level && !existing[0].level) patch.level = word.level;

          if (Object.keys(patch).length > 0) {
            patch.updatedBy = userId;
            await this.db
              .update(vocabWords)
              .set(patch)
              .where(eq(vocabWords.id, existing[0].id));
            result.updated += 1;
          } else {
            result.skipped += 1;
          }
        } else {
          const values: WordInsert = {
            word: word.word,
            display: word.display || word.word,
            pos: word.pos || null,
            zh: word.zh || '',
            phonetic: word.phonetic || null,
            definition: word.definition || null,
            frq: word.frq ?? 0,
            note: word.note || null,
            academic: word.academic || null,
            example: word.example || null,
            exampleZh: word.exampleZh || null,
            banks: word.banks ?? [],
            level: word.level || null,
            createdBy: userId,
            updatedBy: userId,
          };
          await this.db.insert(vocabWords).values(values);
          result.imported += 1;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`第 ${lineNum} 行: ${message}`);
        result.skipped += 1;
      }
    }

    this.logger.log(
      `匯入完成: total=${result.total}, imported=${result.imported}, updated=${result.updated}, skipped=${result.skipped}, errors=${result.errors.length}`,
    );

    return result;
  }

  private normalizeRecord(
    record: Record<string, unknown>,
    format: 'json' | 'csv',
  ): {
    word: string;
    display: string;
    pos: string;
    zh: string;
    phonetic: string;
    definition: string;
    frq: number | undefined;
    note: string;
    academic: string;
    example: string;
    exampleZh: string;
    banks: string[];
    level: string;
  } {
    const asStr = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      return String(v).trim();
    };

    const word = asStr(record.word);
    const display = asStr(record.display);
    const pos = asStr(record.pos);
    const zh = asStr(record.zh);
    const phonetic = asStr(record.phonetic);
    const definition = asStr(record.definition);
    const note = asStr(record.note);
    const academic = asStr(record.academic);
    const example = asStr(record.example);
    const exampleZh = asStr(record.exampleZh);
    const level = asStr(record.level);

    let frq: number | undefined;
    if (record.frq !== undefined && record.frq !== null && record.frq !== '') {
      const num = Number(record.frq);
      if (!Number.isNaN(num)) frq = num;
    }

    let banks: string[] = [];
    if (format === 'csv') {
      const banksRaw = asStr(record.banks);
      if (banksRaw) {
        banks = banksRaw.split('|').map((b: string) => b.trim()).filter(Boolean);
      }
    } else {
      const banksRaw = record.banks;
      if (Array.isArray(banksRaw)) {
        banks = banksRaw.map((b: unknown) => asStr(b)).filter(Boolean);
      } else if (typeof banksRaw === 'string' && banksRaw) {
        banks = [banksRaw];
      }
    }

    return {
      word,
      display,
      pos,
      zh,
      phonetic,
      definition,
      frq,
      note,
      academic,
      example,
      exampleZh,
      banks,
      level,
    };
  }

  private parseCsv(content: string): Array<Record<string, string>> {
    const lines = this.splitCsvLines(content);
    if (lines.length === 0) return [];

    const headers = this.parseCsvLine(lines[0]);
    const records: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.trim() === '') continue;
      const values = this.parseCsvLine(line);
      const record: Record<string, string> = {};
      for (let j = 0; j < headers.length; j += 1) {
        record[headers[j].trim()] = values[j] ?? '';
      }
      records.push(record);
    }

    return records;
  }

  private splitCsvLines(content: string): string[] {
    const lines: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i += 1) {
      const char = content[i];
      const next = content[i + 1];

      if (inQuotes) {
        if (char === '"' && next === '"') {
          current += '"';
          i += 1;
        } else if (char === '"') {
          inQuotes = false;
          current += char;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
        current += char;
      } else if (char === '\r') {
        // skip CR (handle CRLF or CR)
        continue;
      } else if (char === '\n') {
        lines.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    if (current.length > 0) {
      lines.push(current);
    }

    return lines;
  }

  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (inQuotes) {
        if (char === '"' && next === '"') {
          current += '"';
          i += 1;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    fields.push(current);
    return fields;
  }

  private mapRowToVocabWord(row: WordRow): VocabWord {
    return {
      id: row.id,
      word: row.word,
      display: row.display,
      pos: row.pos ?? '',
      zh: row.zh,
      phonetic: row.phonetic ?? '',
      definition: row.definition ?? '',
      frq: row.frq ?? 0,
      note: row.note ?? '',
      academic: row.academic ?? '',
      example: row.example ?? '',
      exampleZh: row.exampleZh ?? '',
      banks: row.banks ?? [],
      level: row.level ?? '',
    };
  }
}
