import { Controller, Get, Req, Res, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Request, Response } from 'express';

/**
 * SPA fallback: serve index.html for every non-API route.
 * (Static assets under /assets are already served by express.static in main.ts.)
 */
@Controller()
export class ViewController {
  @Get('*')
  render(@Req() req: Request, @Res() res: Response): void {
    if (req.path.startsWith('/api/')) {
      throw new NotFoundException();
    }
    const indexPath = join(process.cwd(), 'dist', 'client', 'index.html');
    if (!existsSync(indexPath)) {
      throw new NotFoundException('前端尚未建置，請先執行 npm run build:client');
    }
    res.sendFile(indexPath);
  }
}
