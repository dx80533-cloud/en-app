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
import { NeedLogin } from '../../common/decorators/need-login.decorator';
import { ListeningService } from './listening.service';
import type {
  ListeningQuestion,
  ListeningResult,
  ListeningQuestionType,
} from '../../../shared/api.interface';

interface SubmitListeningDto {
  bank: string;
  level: string;
  answers: Array<{
    wordId: string;
    userAnswer: string;
    correct: boolean;
    type: ListeningQuestionType;
    timeSpent?: number;
  }>;
  durationSeconds: number;
}

@Controller('api/listening')
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}

  @Get('generate')
  async generate(
    @Query('count') count?: string,
    @Query('bank') bank?: string,
    @Query('level') level?: string,
    @Query('types') types?: string,
    @Query('mode') mode?: 'random' | 'review' | 'weak',
    @Req() req?: Request,
  ): Promise<ListeningQuestion[]> {
    const countNum = Math.min(
      Math.max(parseInt(count ?? '10', 10) || 10, 1),
      50,
    );
    const typeList = types
      ? types.split(',').map((t: string) => t.trim())
      : ['listen2zh', 'listenSentence', 'listenSpell'];
    const modeVal = mode ?? 'random';
    const bankVal = bank || 'gept';

    const userId = req?.user?.id ?? null;

    if (modeVal === 'review' && !userId) {
      throw new BadRequestException('複習模式需登入');
    }
    if (modeVal === 'weak' && !userId) {
      throw new BadRequestException('弱項模式需登入');
    }

    return this.listeningService.generate({
      count: countNum,
      bank: bankVal,
      level: level || undefined,
      types: typeList as ListeningQuestionType[],
      mode: modeVal,
      userId: userId ?? undefined,
    });
  }

  @NeedLogin()
  @Post('submit')
  async submit(
    @Req() req: Request,
    @Body() body: SubmitListeningDto,
  ): Promise<ListeningResult> {
    const userId = req.user!.id;
    return this.listeningService.submit(userId, body);
  }
}
