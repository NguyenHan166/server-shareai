import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

import {
  Topics,
  makeEvent,
  AppException,
  ErrorCodes,
  ErrorStatus, // nếu bạn có export; nếu chưa có thì bỏ và để filter map status
} from '@shareai/contracts/src';
import { Prisma } from 'generated/client/client';

type RegisterResult = { accessToken: string; userId: string };
type LoginResult = { accessToken: string; userId: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private signAccessToken(payload: { sub: string; username: string }) {
    try {
      return this.jwt.sign(payload);
    } catch (e: any) {
      // case thực tế: thiếu JWT secret / private key
      throw new AppException({
        code: ErrorCodes.INTERNAL,
        message: 'Auth token service is not configured',
        status: 500,
        details: { reason: e?.message ?? String(e) },
      });
    }
  }

  async register(
    email: string,
    username: string,
    password: string,
  ): Promise<RegisterResult> {
    // (optional) basic validation ở service-level nếu bạn chưa có validation layer
    if (!email || !username || !password) {
      throw new AppException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Missing required fields',
        status: 400,
        details: { required: ['email', 'username', 'password'] },
      });
    }

    // bcrypt cost 10 ok cho đa số; prod có thể 12 tuỳ load
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.authUser.create({
          data: { email, username, passwordHash },
        });

        const ev = makeEvent(
          Topics.Auth.UserRegistered,
          {
            userId: created.id,
            email: created.email,
            username: created.username,
          },
          created.id, // partition key / aggregate id
        );

        // outbox: lưu payload JSON “envelope”
        await tx.outboxEvent.create({
          data: {
            topic: ev.topic,
            // nếu schema Prisma của bạn là Json thì ok.
            // nếu là String/Text thì dùng JSON.stringify(ev)
            payload: ev,
          },
        });

        return created;
      });

      const token = this.signAccessToken({
        sub: user.id,
        username: user.username,
      });
      return { accessToken: token, userId: user.id };
    } catch (e: any) {
      // Unique constraint violation
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // Prisma P2002 có meta.target: ['email'] hoặc ['username'] tuỳ schema
        const target = (e.meta as any)?.target;
        const fields = Array.isArray(target)
          ? target
          : [target].filter(Boolean);

        // Không leak chi tiết quá nhiều; nhưng có thể trả field để UI highlight
        throw new AppException({
          code: ErrorCodes.CONFLICT,
          message: 'Email or username already exists',
          status: 409,
          details: { fields },
        });
      }

      // fallback
      throw new AppException({
        code: ErrorCodes.INTERNAL,
        message: 'Failed to register',
        status: 500,
        details: { reason: e?.message ?? String(e) },
      });
    }
  }

  async login(emailOrUsername: string, password: string): Promise<LoginResult> {
    if (!emailOrUsername || !password) {
      throw new AppException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Missing credentials',
        status: 400,
        details: { required: ['emailOrUsername', 'password'] },
      });
    }

    // Lưu ý: không phân biệt “user không tồn tại” vs “sai mật khẩu”
    // để tránh user enumeration.
    const user = await this.prisma.authUser.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
      select: {
        id: true,
        username: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new AppException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
        status: 401,
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
        status: 401,
      });
    }

    const token = this.signAccessToken({
      sub: user.id,
      username: user.username,
    });
    return { accessToken: token, userId: user.id };
  }
}
