import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConsumersModule } from './consumers/consumers.module';
import { AuthEventsConsumer } from './consumers/auth-events.consumer';

@Module({
  imports: [PrismaModule, ConsumersModule],
  controllers: [AuthEventsConsumer],
  providers: [AppService],
})
export class AppModule {}
