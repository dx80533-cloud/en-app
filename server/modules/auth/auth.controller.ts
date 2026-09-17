import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { AuthService } from './auth.service';

const TOKEN_COOKIE = 'vocab_token';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

interface LoginDto {
  email: string;
  password: string;
}

interface GuestDto {
  nickname: string;
  deviceId: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setTokenCookie(res: Response, token: string): void {
    const secure = this.config.get<string>('COOKIE_SECURE') === 'true';
    res.cookie(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: MAX_AGE,
      path: '/',
    });
  }

  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: { id: string; email: string; name: string; avatar: string; provider: string } }> {
    const email = (body?.email || '').trim().toLowerCase();
    const password = body?.password || '';
    const name = (body?.name || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('請輸入有效的 email');
    }
    if (!password || password.length < 6) {
      throw new BadRequestException('密碼至少需要 6 個字元');
    }

    const { user, token } = await this.authService.register(email, password, name);
    this.setTokenCookie(res, token);
    return { user };
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: { id: string; email: string; name: string; avatar: string; provider: string } }> {
    const email = (body?.email || '').trim().toLowerCase();
    const password = body?.password || '';
    if (!email || !password) {
      throw new BadRequestException('請輸入 email 與密碼');
    }

    const { user, token } = await this.authService.login(email, password);
    this.setTokenCookie(res, token);
    return { user };
  }

  @Post('guest')
  async guest(
    @Body() body: GuestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: { id: string; email: string; name: string; avatar: string; provider: string } }> {
    const nickname = (body?.nickname || '').trim().slice(0, 20);
    const deviceId = (body?.deviceId || '').trim();
    if (!nickname) {
      throw new BadRequestException('請輸入暱稱');
    }
    if (!deviceId || deviceId.length > 128) {
      throw new BadRequestException('缺少有效的裝置識別碼');
    }

    const { user, token } = await this.authService.guestLogin(nickname, deviceId);
    this.setTokenCookie(res, token);
    return { user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { success: true } {
    res.clearCookie(TOKEN_COOKIE, { path: '/' });
    return { success: true };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('me')
  async me(
    @Req() req: Request,
  ): Promise<{
    isLoggedIn: boolean;
    user?: { id: string; email: string; name: string; avatar: string; provider: string };
  }> {
    const user = (req as Request & { user?: { id: string; email: string } }).user;
    if (!user) {
      return { isLoggedIn: false };
    }
    try {
      const full = await this.authService.getUserById(user.id);
      if (!full) return { isLoggedIn: false };
      return { isLoggedIn: true, user: full };
    } catch {
      return { isLoggedIn: false };
    }
  }

  /** Redirect user to Google OAuth consent screen */
  @Get('google')
  googleLogin(@Res() res: Response): void {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const secret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const baseUrl = this.config.get<string>('APP_BASE_URL');
    if (!clientId || !secret || !baseUrl) {
      throw new ServiceUnavailableException(
        'Google 登入尚未設定（需要 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / APP_BASE_URL）',
      );
    }
    const state = this.authService.randomHex(16);
    res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000, path: '/' });
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  /** Google OAuth callback: exchange code, upsert user, set JWT */
  @Get('google/callback')
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const code = (req.query?.code as string) || '';
    const state = (req.query?.state as string) || '';
    const expectedState = (req.cookies as Record<string, string> | undefined)?.oauth_state;

    if (!code || !state || !expectedState || state !== expectedState) {
      res.redirect('/login?error=google_failed');
      return;
    }
    res.clearCookie('oauth_state', { path: '/' });

    try {
      const { user, token } = await this.authService.loginWithGoogle(code);
      this.setTokenCookie(res, token);
      const returnUrl = (req.cookies as Record<string, string> | undefined)?.oauth_return || '/';
      res.clearCookie('oauth_return', { path: '/' });
      const safeReturn = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/';
      res.redirect(safeReturn);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'google login failed';
      res.redirect(`/login?error=${encodeURIComponent(message)}`);
    }
  }
}
