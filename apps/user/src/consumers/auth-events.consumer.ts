import { Controller, Logger } from '@nestjs/common';
import {
  MessagePattern,
  Payload,
  Ctx,
  KafkaContext,
} from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { Topics } from '@shareai/contracts/src';

type UserRegisteredEvent = {
  eventId: string;
  topic: string;
  occurredAt: string;
  actorUserId: string | null;
  data: { userId: string; email: string; username: string };
};

function parseKafkaValue(value: any): any {
  // Nest Kafka có thể đưa value đã parse hoặc Buffer/string
  if (value == null) return null;
  if (Buffer.isBuffer(value)) {
    const s = value.toString('utf8');
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  // đôi khi payload là { value: ... }
  if (typeof value === 'object' && 'value' in value)
    return parseKafkaValue((value as any).value);
  return value;
}

@Controller()
export class AuthEventsConsumer {
  private readonly logger = new Logger(AuthEventsConsumer.name);

  constructor(private prisma: PrismaService) {}

  @MessagePattern(Topics.Auth.UserRegistered)
  async onUserRegistered(@Payload() payload: any, @Ctx() ctx: KafkaContext) {
    const msg = ctx.getMessage();
    const value = parseKafkaValue((msg as any).value ?? payload);

    const ev = value as UserRegisteredEvent;
    if (!ev?.eventId || !ev?.data?.userId) {
      this.logger.warn(`Invalid event payload: ${JSON.stringify(value)}`);
      return;
    }

    // Inbox idempotency + create profile (transaction)
    await this.prisma.$transaction(async (tx) => {
      const existed = await tx.inboxEvent.findUnique({
        where: { eventId: ev.eventId },
      });
      if (existed) return;

      await tx.profile.upsert({
        where: { userId: ev.data.userId },
        create: {
          userId: ev.data.userId,
          email: ev.data.email,
          username: ev.data.username,
          name: null,
          verifiedTier: 'NONE',
        },
        update: {
          email: ev.data.email,
          username: ev.data.username,
        },
      });

      await tx.inboxEvent.create({
        data: { eventId: ev.eventId, topic: ev.topic },
      });
    });

    this.logger.log(
      `Profile created/updated for userId=${ev.data.userId} via eventId=${ev.eventId}`,
    );
  }
}
