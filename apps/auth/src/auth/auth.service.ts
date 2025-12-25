import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Topics, makeEvent } from '@shareai/contracts/src';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(email: string, username: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);

    // Transaction: create user + outbox event
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.authUser.create({
        data: { email, username, passwordHash },
      });

      const ev = makeEvent(
        Topics.Auth.UserRegistered,
        {
          userId: user.id,
          email: user.email,
          username: user.username,
        },
        user.id,
      );

      await tx.outboxEvent.create({
        data: {
          topic: ev.topic,
          payload: ev, // store whole envelope
        },
      });

      return user;
    });

    const token = this.jwt.sign({ sub: result.id, username: result.username });
    return { accessToken: token, userId: result.id };
  }

  async login(emailOrUsername: string, password: string) {
    const user = await this.prisma.authUser.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwt.sign({ sub: user.id, username: user.username });
    return { accessToken: token, userId: user.id };
  }
}
