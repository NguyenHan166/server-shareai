import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OutboxPublisher } from './outbox.publisher';

@Injectable()
export class OutboxScheduler {
  constructor(private outbox: OutboxPublisher) {}

  // 1s flush (dev). Prod: worker riêng + backoff.
  @Interval(1000)
  async tick() {
    await this.outbox.flushOnce(50);
  }
}
