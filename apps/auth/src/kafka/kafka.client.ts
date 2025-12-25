import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientKafka, Transport } from '@nestjs/microservices';

@Injectable()
export class KafkaClient implements OnModuleInit, OnModuleDestroy {
  private client: ClientKafka;

  constructor() {
    this.client = new (require('@nestjs/microservices').ClientKafka)({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: process.env.KAFKA_CLIENT_ID ?? 'shareai-auth',
          brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
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
}
