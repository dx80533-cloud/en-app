import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthUserPayload } from './jwt-auth.guard';

/**
 * Optional auth: verifies the JWT when present and attaches req.user,
 * but does NOT reject anonymous requests (used by /api/auth/me).
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const cookies = (req.cookies ?? {}) as Record<string, string>;
    const authHeader = req.headers?.authorization;
    const token =
      cookies.vocab_token ||
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);

    if (!token) return true;

    try {
      const payload = this.jwt.verify(token) as { sub: string; email?: string };
      (req as Request & { user: AuthUserPayload }).user = {
        id: payload.sub,
        email: payload.email || '',
        name: '',
        avatar: '',
        provider: 'email',
      };
    } catch {
      // invalid token -> treat as anonymous
    }
    return true;
  }
}
