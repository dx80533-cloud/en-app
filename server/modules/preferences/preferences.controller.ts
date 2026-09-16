import { Controller, Get, Put, Body, Req, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '../../common/decorators/need-login.decorator';
import { PreferencesService } from './preferences.service';
import type { ThemeType, UserPreferences, UserSettings } from '../../../shared/api.interface';

const VALID_THEMES: string[] = [
  'default',
  'midnight',
  'beyblade',
  'manga',
  'candy',
  'retro',
];

interface ThemeUpdateDto {
  theme: string;
}

@Controller('api/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @NeedLogin()
  @Get()
  async getPreferences(@Req() req: Request): Promise<UserPreferences> {
    const userId = req.user!.id;
    return this.preferencesService.getPreferences(userId);
  }

  @NeedLogin()
  @Put('theme')
  async updateTheme(
    @Req() req: Request,
    @Body() body: ThemeUpdateDto,
  ): Promise<{ theme: ThemeType }> {
    const userId = req.user!.id;
    const theme = body?.theme;
    if (!theme || !VALID_THEMES.includes(theme)) {
      throw new BadRequestException('無效的主題類型');
    }
    return this.preferencesService.updateTheme(userId, theme as ThemeType);
  }

  @NeedLogin()
  @Put('settings')
  async updateSettings(
    @Req() req: Request,
    @Body() body: UserSettings,
  ): Promise<{ settings: UserSettings }> {
    const userId = req.user!.id;
    return this.preferencesService.updateSettings(userId, body);
  }
}
