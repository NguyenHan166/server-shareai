import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KafkaClient } from '../kafka/kafka.client';

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  private readonly maxAttempts = 8;

  constructor(
    private prisma: PrismaService,
    private kafka: KafkaClient,
  ) {}

  private backoffMs(attempt: number) {
    const base = Math.min(15 * 60_000, 1000 * Math.pow(2, attempt));
    const jitter = Math.floor(Math.random() * 500);
    return base + jitter;
  }

  private dlqTopic(topic: string) {
    return `dlq.${topic}`;
  }

  async flushOnce(limit = 50) {
    const now = new Date();

    const pending = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        nextAttemptAt: { lte: now },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    if (pending.length === 0) return;

    for (const ev of pending) {
      // claim chống chạy trùng nếu nhiều instance
      const claimed = await this.prisma.outboxEvent.updateMany({
        where: { id: ev.id, status: 'PENDING' },
        data: { status: 'PROCESSING' },
      });
      if (claimed.count !== 1) continue;

      await this.processOne(ev.id);
    }
  }

  private async processOne(id: string) {
    const ev = await this.prisma.outboxEvent.findUnique({ where: { id } });
    if (!ev) return;

    try {
      // publish main topic
      await this.kafka.emitEvent(
        ev.topic,
        ev.payload,
        ev.key ?? undefined,
        ev.headers ?? undefined,
      );

      await this.prisma.outboxEvent.update({
        where: { id: ev.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          lastError: null,
        },
      });
    } catch (err: any) {
      const attempts = ev.attempts + 1;
      const errMsg = err?.message ?? String(err);
      const failHard = attempts >= this.maxAttempts;

      if (failHard) {
        try {
          await this.kafka.emitEvent(this.dlqTopic(ev.topic), {
            outboxId: ev.id,
            originalTopic: ev.topic,
            attempts,
            error: errMsg,
            payload: ev.payload,
            headers: ev.headers ?? null,
            failedAt: new Date().toISOString(),
          });
        } catch (dlqErr: any) {
          this.logger.error(
            `DLQ publish failed outboxId=${ev.id} err=${dlqErr?.message ?? dlqErr}`,
          );
        }
      }

      await this.prisma.outboxEvent.update({
        where: { id: ev.id },
        data: {
          status: failHard ? 'FAILED' : 'PENDING',
          attempts,
          lastError: errMsg,
          nextAttemptAt: failHard
            ? new Date()
            : new Date(Date.now() + this.backoffMs(attempts)),
        },
      });

      this.logger.warn(
        `Publish failed outboxId=${ev.id} topic=${ev.topic} attempts=${attempts} failHard=${failHard} err=${errMsg}`,
      );
    }
  }
}
