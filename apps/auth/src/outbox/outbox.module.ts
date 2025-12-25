import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KafkaModule } from '../kafka/kafka.module';
import { OutboxPublisher } from './outbox.publisher';
import { OutboxScheduler } from './outbox.scheduler';

@Module({
  imports: [PrismaModule, KafkaModule],
  providers: [OutboxPublisher, OutboxScheduler],
  exports: [OutboxPublisher],
})
export class OutboxModule {}
