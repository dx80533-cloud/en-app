import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  avatar: string;
  provider: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const cookies = (req.cookies ?? {}) as Record<string, string>;
    const authHeader = req.headers?.authorization;
    const token =
      cookies.vocab_token ||
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);

    if (!token) {
      throw new UnauthorizedException('請先登入');
    }

    try {
      const payload = this.jwt.verify(token) as {
        sub: string;
        email?: string;
      };
      (req as Request & { user: AuthUserPayload }).user = {
        id: payload.sub,
        email: payload.email || '',
        name: '',
        avatar: '',
        provider: 'email',
      };
      return true;
    } catch {
      throw new UnauthorizedException('登入已過期，請重新登入');
    }
  }
}
