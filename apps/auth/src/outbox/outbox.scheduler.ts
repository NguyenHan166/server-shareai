import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OutboxPublisher } from './outbox.publisher';

@Injectable()
export class OutboxScheduler {
  private running = false;

  constructor(private outbox: OutboxPublisher) {}

  @Interval(1000)
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.outbox.flushOnce(50);
    } finally {
      this.running = false;
    }
  }
}
