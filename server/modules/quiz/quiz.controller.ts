import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { QuizService } from './quiz.service';
import type { QuizQuestion, QuizResult } from '@shared/api.interface';

interface SubmitQuizDto {
  quizType: string;
  bank: string;
  level: string;
  answers: Array<{
    questionId: string;
    wordId: string;
    userAnswer: string;
    correct: boolean;
    timeSpent?: number;
  }>;
  durationSeconds: number;
}

@Controller('api/quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('generate')
  async generate(
    @Query('count') count?: string,
    @Query('bank') bank?: string,
    @Query('level') level?: string,
    @Query('types') types?: string,
    @Query('mode') mode?: 'random' | 'review' | 'weak',
    @Req() req?: Request,
  ): Promise<QuizQuestion[]> {
    const countNum = Math.min(
      Math.max(parseInt(count ?? '10', 10) || 10, 1),
      50,
    );
    const typeList = types
      ? types.split(',').map((t: string) => t.trim())
      : ['en2zh', 'zh2en', 'spelling', 'cloze'];
    const modeVal = mode ?? 'random';

    const userId = req?.userContext?.userId ?? null;

    if (modeVal === 'review' && !userId) {
      throw new BadRequestException('複習模式需登入');
    }
    if (modeVal === 'weak' && !userId) {
      throw new BadRequestException('弱項模式需登入');
    }

    return this.quizService.generate({
      count: countNum,
      bank: bank || undefined,
      level: level || undefined,
      types: typeList as QuizQuestion['type'][],
      mode: modeVal,
      userId: userId ?? undefined,
    });
  }

  @NeedLogin()
  @Post('submit')
  async submit(
    @Req() req: Request,
    @Body() body: SubmitQuizDto,
  ): Promise<QuizResult> {
    const { userId } = req.userContext;
    return this.quizService.submit(userId, body);
  }
}
