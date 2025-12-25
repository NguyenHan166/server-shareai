import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KafkaClient } from '../kafka/kafka.client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  constructor(
    private prisma: PrismaService,
    private kafka: KafkaClient,
  ) {}

  async flushOnce(limit = 50) {
    const pending = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    if (pending.length === 0) return;

    for (const ev of pending) {
      try {
        // emit(topic, message)
        await firstValueFrom(this.kafka.get().emit(ev.topic, ev.payload));

        await this.prisma.outboxEvent.update({
          where: { id: ev.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
      } catch (err: any) {
        this.logger.error(
          `Publish failed: ${ev.id} topic=${ev.topic} err=${err?.message ?? err}`,
        );
        await this.prisma.outboxEvent.update({
          where: { id: ev.id },
          data: { status: 'FAILED', attempts: { increment: 1 } },
        });
      }
    }
  }
}
