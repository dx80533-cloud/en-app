import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type VocabDb } from '../../database/database.module';
import { vocabUserPreferences } from '../../database/schema';
import { eq } from 'drizzle-orm';
import type { ThemeType, UserSettings } from '../../../shared/api.interface';

interface PrefRecord {
  id: string;
  userId: string;
  theme: string;
  settings: UserSettings | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: VocabDb) {}

  async getPreferences(userId: string): Promise<{ theme: ThemeType; settings: UserSettings }> {
    const rows = await this.db
      .select()
      .from(vocabUserPreferences)
      .where(eq(vocabUserPreferences.userId, userId));

    if (rows.length > 0) {
      const row = rows[0];
      return {
        theme: (row.theme as ThemeType) || 'default',
        settings: (row.settings as UserSettings) || {},
      };
    }

    return { theme: 'default', settings: {} };
  }

  async updateTheme(userId: string, theme: ThemeType): Promise<{ theme: ThemeType }> {
    const existing = await this.db
      .select({ id: vocabUserPreferences.id })
      .from(vocabUserPreferences)
      .where(eq(vocabUserPreferences.userId, userId));

    if (existing.length > 0) {
      await this.db
        .update(vocabUserPreferences)
        .set({ theme, updatedAt: new Date() })
        .where(eq(vocabUserPreferences.userId, userId));
    } else {
      await this.db.insert(vocabUserPreferences).values({
        userId,
        theme,
        settings: {} as any,
      });
    }

    return { theme };
  }

  async updateSettings(
    userId: string,
    settings: UserSettings,
  ): Promise<{ settings: UserSettings }> {
    const existing = await this.db
      .select({ id: vocabUserPreferences.id })
      .from(vocabUserPreferences)
      .where(eq(vocabUserPreferences.userId, userId));

    if (existing.length > 0) {
      await this.db
        .update(vocabUserPreferences)
        .set({ settings: settings as any, updatedAt: new Date() })
        .where(eq(vocabUserPreferences.userId, userId));
    } else {
      await this.db.insert(vocabUserPreferences).values({
        userId,
        theme: 'default',
        settings: settings as any,
      });
    }

    return { settings };
  }
}
