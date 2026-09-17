import { Injectable, Inject, Logger, ConflictException, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, or } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { DRIZZLE_DATABASE, type VocabDb } from '../../database/database.module';
import { users } from '../../database/schema';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  provider: string;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string;
  googleId: string | null;
  passwordHash: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: VocabDb,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  randomHex(bytes: number): string {
    return randomBytes(bytes).toString('hex');
  }

  private hashPassword(password: string, salt?: string): string {
    const s = salt || randomBytes(16).toString('hex');
    const hash = createHash('sha256')
      .update(`${s}:${password}`)
      .digest('hex');
    return `${s}$${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const candidate = createHash('sha256')
      .update(`${salt}:${password}`)
      .digest('hex');
    return candidate === hash;
  }

  private toAuthUser(row: UserRow): AuthUser {
    return {
      id: row.id,
      email: row.email,
      name: row.name || row.email.split('@')[0] || '使用者',
      avatar: row.avatar || '',
      provider: row.provider,
    };
  }

  private signToken(user: UserRow): string {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    if (rows.length === 0) return null;
    return this.toAuthUser(rows[0] as unknown as UserRow);
  }

  async register(email: string, password: string, name: string): Promise<AuthResult> {
    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (existing.length > 0) {
      throw new ConflictException('此 email 已註冊，請直接登入');
    }

    const row = await this.db
      .insert(users)
      .values({
        email,
        passwordHash: this.hashPassword(password),
        name: name || email.split('@')[0],
        provider: 'email',
      })
      .returning();

    const user = row[0] as unknown as UserRow;
    return { user: this.toAuthUser(user), token: this.signToken(user) };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const rows = await this.db.select().from(users).where(eq(users.email, email));
    const user = rows[0] as unknown as UserRow | undefined;
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('email 或密碼錯誤');
    }
    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('email 或密碼錯誤');
    }
    return { user: this.toAuthUser(user), token: this.signToken(user) };
  }

  /**
   * Guest mode: a device-local anonymous account derived from a device id.
   * Same device id always maps to the same account, so progress persists
   * across visits (and across browsers) as long as the device id is kept.
   */
  async guestLogin(nickname: string, deviceId: string): Promise<AuthResult> {
    const cleanNick = (nickname || '').trim().slice(0, 20) || '學員';
    const devId = (deviceId || '').trim();
    if (!devId) {
      throw new UnauthorizedException('缺少裝置識別碼');
    }
    const email = `guest_${createHash('sha256').update(devId).digest('hex').slice(0, 20)}@guest.local`;

    const rows = await this.db.select().from(users).where(eq(users.email, email));
    let user: UserRow;
    if (rows.length > 0) {
      user = rows[0] as unknown as UserRow;
      if (user.name !== cleanNick) {
        const updated = await this.db
          .update(users)
          .set({ name: cleanNick, avatar: '' })
          .where(eq(users.id, user.id))
          .returning();
        user = updated[0] as unknown as UserRow;
      }
    } else {
      const created = await this.db
        .insert(users)
        .values({
          email,
          name: cleanNick,
          provider: 'guest',
        })
        .returning();
      user = created[0] as unknown as UserRow;
    }
    return { user: this.toAuthUser(user), token: this.signToken(user) };
  }

  async loginWithGoogle(code: string): Promise<AuthResult> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const baseUrl = this.config.get<string>('APP_BASE_URL');
    if (!clientId || !clientSecret || !baseUrl) {
      throw new ServiceUnavailableException('Google OAuth 未設定');
    }
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      this.logger.warn(`google token exchange failed: ${tokenRes.status} ${text.slice(0, 200)}`);
      throw new UnauthorizedException('Google 驗證失敗，請重試');
    }
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) {
      throw new UnauthorizedException('Google 驗證失敗，請重試');
    }

    // fetch user profile
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) {
      throw new UnauthorizedException('Google 取得使用者資料失敗');
    }
    const info = (await infoRes.json()) as {
      id?: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!info.email) {
      throw new UnauthorizedException('Google 帳號缺少 email，無法登入');
    }

    const rows = await this.db
      .select()
      .from(users)
      .where(or(eq(users.googleId, info.id || ''), eq(users.email, info.email.toLowerCase())));

    let user: UserRow;
    if (rows.length > 0) {
      user = rows[0] as unknown as UserRow;
      // attach google id if first google login
      if (!user.googleId && info.id) {
        const updated = await this.db
          .update(users)
          .set({ googleId: info.id, provider: 'google' })
          .where(eq(users.id, user.id))
          .returning();
        user = updated[0] as unknown as UserRow;
      }
    } else {
      const created = await this.db
        .insert(users)
        .values({
          email: info.email.toLowerCase(),
          name: info.name || info.email.split('@')[0],
          avatar: info.picture || null,
          googleId: info.id || null,
          provider: 'google',
        })
        .returning();
      user = created[0] as unknown as UserRow;
    }

    return { user: this.toAuthUser(user), token: this.signToken(user) };
  }
}
