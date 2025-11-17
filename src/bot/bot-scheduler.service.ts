import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BotHandler } from 'src/bot/bot.handler';

@Injectable()
export class BotSchedulerService {
  private readonly logger = new Logger(BotSchedulerService.name);

  public constructor(private readonly botHandler: BotHandler) {}

  @Cron(CronExpression.EVERY_MINUTE)
  private async sendTelegtamReminders() {
    await this.botHandler.sendReminders();
  }
}
