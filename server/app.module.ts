import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
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
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    VocabularyModule,
    LearningModule,
    StatsModule,
    QuizModule,
    ListeningModule,
    AdminModule,
    PreferencesModule,
    // ====== @route-section: business-modules END ======

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
