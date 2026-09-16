import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { VocabularyService } from './vocabulary.service';
import type {
  VocabWordWithProgress,
  WordListResponse,
  WordBanksInfo,
} from '@shared/api.interface';

@Controller('api/vocabulary')
export class VocabularyController {
  private readonly logger = new Logger(VocabularyController.name);

  constructor(private readonly vocabularyService: VocabularyService) {}

  @Get('words')
  async getWords(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('bank') bank?: string,
    @Query('level') level?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('status') status?: string,
  ): Promise<WordListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    const userId: string | undefined = req.userContext?.userId;

    this.logger.log(
      `查詢單字列表 page=${pageNum} pageSize=${pageSizeNum} bank=${bank ?? 'all'} level=${level ?? 'all'}`,
    );

    return this.vocabularyService.getWordList({
      page: pageNum,
      pageSize: pageSizeNum,
      bank,
      level,
      search,
      sort: sort as 'frq_desc' | 'word_asc' | undefined,
      status,
      userId: userId ?? null,
    });
  }

  @Get('words/:id')
  async getWordDetail(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<VocabWordWithProgress> {
    const userId: string | undefined = req.userContext?.userId;
    const word: VocabWordWithProgress | null =
      await this.vocabularyService.getWordDetail(id, userId ?? null);

    if (!word) {
      throw new NotFoundException('單字不存在');
    }

    return word;
  }

  @Get('banks')
  async getBanksInfo(): Promise<WordBanksInfo> {
    return this.vocabularyService.getBanksInfo();
  }

  @NeedLogin()
  @Post('words/:id/favorite')
  async toggleFavorite(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ isFavorite: boolean }> {
    const { userId } = req.userContext;
    this.logger.log(`切換收藏 wordId=${id} userId=${userId}`);
    return this.vocabularyService.toggleFavorite(id, userId);
  }

  @NeedLogin()
  @Get('favorites')
  async getFavorites(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<WordListResponse> {
    const { userId } = req.userContext;
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;

    return this.vocabularyService.getFavorites({
      page: pageNum,
      pageSize: pageSizeNum,
      userId,
    });
  }
}
