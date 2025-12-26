import 'reflect-metadata';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

// Load .env before anything else
config();

console.log(
  '🔑 JWT_SECRET loaded:',
  process.env.JWT_SECRET ? '✓ Found' : '✗ Not found',
);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // gRPC server
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: process.env.GRPC_URL ?? '0.0.0.0:50051',
      package: 'shareai.auth',
      protoPath: require.resolve('@shareai/proto/auth.proto'),
    },
  });

  // Kafka (optional for Auth: chủ yếu publish; vẫn init để có connection quản lý)
  app.connectMicroservice<MicroserviceOptions>({
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

  await app.startAllMicroservices();

  // HTTP minimal (health)
  await app.listen(3001);
}
bootstrap();
