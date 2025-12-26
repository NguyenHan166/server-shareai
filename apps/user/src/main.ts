import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Kafka consumer
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID ?? 'shareai-user',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
        allowAutoTopicCreation: true,
      },
      consumer: {
        groupId: process.env.KAFKA_GROUP_ID ?? 'shareai-user',
      },
    },
  });

  await app.startAllMicroservices();

  // HTTP minimal (health)
  await app.listen(3002);
}
bootstrap();
