import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Cache } from 'cache-manager'; // Replace with actual cache manager type
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import ms from 'ms';
import { Branded } from '../../common/types/types';
import { AllConfigType } from '../../config/config.type';
import { SYSTEM_USER_ID } from '../../constants/app.constant';
import { CacheKey } from '../../constants/cache.constant';
import { ErrorCode } from '../../constants/error-code.constant';
import { DRIZZLE } from '../../database/database.module';
import {
  referralTable,
  sessionTable,
  usersTable,
} from '../../database/schemas';
import type { DrizzleDB } from '../../database/types/drizzle';
import { ValidationException } from '../../exceptions/validation.exception';
import { createCacheKey } from '../../utils/cache.util';
import { hashPassword, verifyPassword } from '../../utils/password.util';
import { UsersService } from '../users/users.service';
import { LoginReqDto } from './dto/login.req.dto';
import { LoginResDto } from './dto/login.res.dto';
import { RefreshReqDto } from './dto/refresh.req.dto';
import { RefreshResDto } from './dto/refresh.res.dto';
import { RegisterReqDto } from './dto/register.req.dto';
import { RegisterResDto } from './dto/register.res.dto';
import { JwtPayloadType } from './types/jwt-payload.type';
import { JwtRefreshPayloadType } from './types/jwt-refresh-payload.type';
import { RoleEnum } from './types/role.enum';
type Token = Branded<
  {
    accessToken: string;
    refreshToken: string;
    tokenExpires: number;
  },
  'token'
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly usersService: UsersService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache, // Replace with actual type
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  async signIn(reqDto: LoginReqDto): Promise<LoginResDto> {
    const user = await this.db.query.usersTable.findFirst({
      where: eq(usersTable.phone, reqDto.username),
      columns: {
        id: true,
        password: true,
        phone: true,
        role: true,
      },
    });

    const isPasswordValid =
      user && (await verifyPassword(reqDto.password, user.password));

    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const [session] = await this.db
      .insert(sessionTable)
      .values({
        hash,
        userId: user.id,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      })
      .returning({
        id: sessionTable.id,
      });
    console.log('session', session);

    const token = await this.createToken({
      id: user.id,
      sessionId: session.id,
      role: user.role,
      hash,
    });
    console.log('token', token);

    return plainToInstance(LoginResDto, {
      userId: user.id,
      ...token,
    });
  }

  private async createToken(data: {
    id: string;
    sessionId: string;
    role: RoleEnum;
    hash: string;
  }): Promise<Token> {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn);
    console.log('tokenExpiresIn', tokenExpiresIn, 'tokenExpires', tokenExpires);

    const [accessToken, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.id,
          role: data.role,
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        },
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      tokenExpires,
    } as unknown as Token;
  }

  // excited code
  async existReferralCode(referralCode: string): Promise<boolean> {
    return this.db
      .select()
      .from(referralTable)
      .where(eq(referralTable.code, referralCode))
      .then((result) => result.length > 0);
  }

  async register(reqDto: RegisterReqDto): Promise<RegisterResDto> {
    //-------------------------------------------------------
    // 1. Check if user already exists
    //-------------------------------------------------------
    const isExistUser = await this.usersService.existByUserPhone(reqDto.phone);

    if (isExistUser) {
      throw new ValidationException(ErrorCode.U002);
    }
    const isExistReferralCpde = await this.existReferralCode(
      reqDto.referralCode,
    );
    if (!isExistReferralCpde) {
      throw new UnauthorizedException();
    }

    //-------------------------------------------------------
    // 2. Create user
    //-------------------------------------------------------
    const hashedPassword = await hashPassword(reqDto.password);
    const [createdUser] = await this.db
      .insert(usersTable)
      .values({
        ...reqDto,
        password: hashedPassword,
      })
      .returning({
        id: usersTable.id,
      });

    return plainToInstance(RegisterResDto, {
      userId: createdUser.id,
    });
  }

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    let payload: JwtPayloadType;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException();
    }

    // Force logout if the session is in the blacklist
    const isSessionBlacklisted = await this.cache.get<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, payload.sessionId),
    );

    if (isSessionBlacklisted) {
      throw new UnauthorizedException();
    }
    console.log('payload', payload);

    return payload;
  }

  async logout(payload: JwtPayloadType): Promise<void> {
    await this.cache.set<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, payload.sessionId),
      true,
      payload.exp * 1000 - Date.now(),
    );
    await this.db
      .delete(sessionTable)
      .where(eq(sessionTable.id, payload.sessionId));
  }

  private verifyRefreshToken(token: string): JwtRefreshPayloadType {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.refreshSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  async refreshToken(reqDto: RefreshReqDto): Promise<RefreshResDto> {
    const { sessionId, hash } = this.verifyRefreshToken(reqDto.refreshToken);
    const session = await this.db.query.sessionTable.findFirst({
      where: eq(sessionTable.id, sessionId),
    });

    if (!session || session.hash !== hash) {
      throw new UnauthorizedException();
    }

    const user = await this.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const newHash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    await this.db
      .update(sessionTable)
      .set({ hash: newHash })
      .where(eq(sessionTable.id, session.id));

    return await this.createToken({
      id: user.id,
      sessionId: session.id,
      role: user.role,
      hash: newHash,
    });
  }
}
