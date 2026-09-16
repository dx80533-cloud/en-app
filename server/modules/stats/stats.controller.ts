import {
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '../../common/decorators/need-login.decorator';
import { StatsService } from './stats.service';
import type { UserStats } from '../../../shared/api.interface';

interface WordProgressResponse {
  new: number;
  learning: number;
  reviewed: number;
  mastered: number;
  total: number;
}

interface QuizRecordItem {
  id: string;
  quizType: string;
  bank: string;
  level: string | null;
  totalQuestions: number;
  correctCount: number;
  score: number;
  durationSeconds: number;
  createdAt: string;
}

@Controller('api/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @NeedLogin()
  @Get('overview')
  async getOverview(@Req() req: Request): Promise<UserStats> {
    const userId = req.user!.id;
    return this.statsService.getOverview(userId);
  }

  @NeedLogin()
  @Get('recent-quizzes')
  async getRecentQuizzes(
    @Req() req: Request,
    @Query('limit') limit?: string,
  ): Promise<QuizRecordItem[]> {
    const userId = req.user!.id;
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.statsService.getRecentQuizzes(userId, limitNum);
  }

  @NeedLogin()
  @Get('word-progress')
  async getWordProgress(@Req() req: Request): Promise<WordProgressResponse> {
    const userId = req.user!.id;
    return this.statsService.getWordProgress(userId);
  }
}
