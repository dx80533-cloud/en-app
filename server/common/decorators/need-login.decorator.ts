import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Drop-in replacement for the platform `@NeedLogin()` decorator.
 * Guards the route with JWT auth (httpOnly cookie or Bearer token).
 */
export function NeedLogin(): MethodDecorator & ClassDecorator {
  return applyDecorators(UseGuards(JwtAuthGuard));
}
