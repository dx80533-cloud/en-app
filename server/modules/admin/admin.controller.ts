import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  Req,
  Query,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { AdminService } from './admin.service';
import { ExampleFillerService } from './example-filler.service';
import type {
  VocabWord,
  ImportResult,
  WordListResponse,
} from '@shared/api.interface';

interface CreateWordDto {
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

interface UpdateWordDto {
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

interface FillExamplesDto {
  limit?: number;
  dryRun?: boolean;
}

interface MulterUploadedFile {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@NeedLogin()
@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly exampleFillerService: ExampleFillerService,
  ) {}

  @Post('words')
  async createWord(
    @Req() req: Request,
    @Body() dto: CreateWordDto,
  ): Promise<VocabWord> {
    const { userId } = req.userContext;
    return this.adminService.createWord(dto, userId);
  }

  @Get('words')
  async listWords(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ): Promise<WordListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    return this.adminService.listWords({
      page: pageNum,
      pageSize: pageSizeNum,
      search,
    });
  }

  @Patch('words/:id')
  async updateWord(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateWordDto,
  ): Promise<VocabWord> {
    const { userId } = req.userContext;
    return this.adminService.updateWord(id, dto, userId);
  }

  @Delete('words/:id')
  async deleteWord(@Param('id') id: string): Promise<{ success: true }> {
    return this.adminService.deleteWord(id);
  }

  @Post('words/import')
  @UseInterceptors(FileInterceptor('file'))
  async importWords(
    @Req() req: Request,
    @UploadedFile() file: MulterUploadedFile | undefined,
    @Body() body: { format?: string },
  ): Promise<ImportResult> {
    const { userId } = req.userContext;
    const format = body.format?.toLowerCase();

    if (!file) {
      throw new BadRequestException('未上傳檔案');
    }
    if (!format || (format !== 'json' && format !== 'csv')) {
      throw new BadRequestException('format 必須是 json 或 csv');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('檔案大小超過 10MB 上限');
    }

    return this.adminService.importWords(file.buffer, format as 'json' | 'csv', userId);
  }

  @Post('examples/fill')
  async fillExamples(
    @Body() dto: FillExamplesDto,
  ): Promise<{ filled: number; totalMissing: number }> {
    const limit = dto.limit !== undefined ? Number(dto.limit) : 50;
    const dryRun = Boolean(dto.dryRun);
    return this.exampleFillerService.fillMissingExamples({ limit, dryRun });
  }
}
