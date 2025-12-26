import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ClientKafka, Transport } from '@nestjs/microservices';

@Injectable()
export class KafkaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaClient.name);
  private client: ClientKafka;

  constructor() {
    this.client = new (require('@nestjs/microservices').ClientKafka)({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: process.env.KAFKA_CLIENT_ID ?? 'shareai-auth',
          brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
          allowAutoTopicCreation: true,
        },
        consumer: {
          groupId: process.env.KAFKA_GROUP_ID ?? 'shareai-auth',
        },
      },
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  get() {
    return this.client;
  }

  /**
   * Publish event with best-effort broker ack using KafkaJS producer.send if available.
   * Falls back to ClientKafka.emit (fire-and-forget) if producer isn't accessible.
   */
  async emitEvent(topic: string, value: any, key?: string, headers?: unknown) {
    const producer = (this.client as any)?.producer;
    if (producer?.send) {
      const toBuf = (v: any) =>
        v == null ? undefined : Buffer.from(String(v));

      await producer.send({
        topic,
        messages: [
          {
            key: key ? Buffer.from(key) : undefined,
            value: Buffer.from(JSON.stringify(value)),
            headers: headers
              ? Object.fromEntries(
                  Object.entries(headers).map(([k, v]) => [k, toBuf(v)]),
                )
              : undefined,
          },
        ],
      });
      return;
    }

    // fallback
    this.logger.warn(
      `Kafka producer not available, falling back to ClientKafka.emit for topic=${topic}`,
    );
    // emit expects "message" - Nest wraps it; keep as-is
    await new Promise<void>((resolve, reject) => {
      const sub = this.client.emit(topic, value).subscribe({
        complete: () => resolve(),
        error: (e: any) => reject(e),
      });
      // no need to unsubscribe normally; complete/error should happen
      void sub;
    });
  }
}
