import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { LearningModule } from './modules/learning/learning.module';
import { StatsModule } from './modules/stats/stats.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { ListeningModule } from './modules/listening/listening.module';
import { AdminModule } from './modules/admin/admin.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'data/.env'],
    }),
    DatabaseModule,
    AuthModule,
    // ====== business modules ======
    VocabularyModule,
    LearningModule,
    StatsModule,
    QuizModule,
    ListeningModule,
    AdminModule,
    PreferencesModule,

    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
