import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '../../common/decorators/need-login.decorator';
import { LearningService } from './learning.service';
import type {
  VocabWordWithProgress,
  LearningSessionResult,
} from '../../../shared/api.interface';

interface DailyGoalResponse {
  dailyGoal: number;
  todayStudied: number;
  todayCorrect: number;
}

interface SubmitAnswerBody {
  wordId: string;
  correct: boolean;
  timeSpent?: number;
}

@Controller('api/learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('due-words')
  async getDueWords(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('mode') mode?: string,
    @Query('bank') bank?: string,
    @Query('level') level?: string,
  ): Promise<VocabWordWithProgress[]> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const modeVal = (mode as 'review' | 'new' | 'all') || 'all';
    const userId = req.user?.id;
    return this.learningService.getDueWords(
      limitNum,
      modeVal,
      bank,
      level,
      userId,
    );
  }

  @NeedLogin()
  @Post('submit-answer')
  async submitAnswer(
    @Req() req: Request,
    @Body() body: SubmitAnswerBody,
  ): Promise<LearningSessionResult> {
    const userId = req.user!.id;
    return this.learningService.submitAnswer(
      userId,
      body.wordId,
      body.correct,
      body.timeSpent,
    );
  }

  @NeedLogin()
  @Get('daily-goal')
  async getDailyGoal(@Req() req: Request): Promise<DailyGoalResponse> {
    const userId = req.user!.id;
    return this.learningService.getDailyGoal(userId);
  }
}
