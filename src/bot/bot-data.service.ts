import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TelegramAnswer } from './schema/telegram-answer.schema';

@Injectable()
export class BotDataService {
  private readonly logger = new Logger(BotDataService.name);

  public constructor(
    @InjectModel(TelegramAnswer.name)
    private readonly telegramAnswerModel: Model<TelegramAnswer>,
  ) {}

  public async getRange(start: Date, end: Date): Promise<any[]> {
    return await this.telegramAnswerModel.find({
      date: { $gte: start, $lt: end },
    });
  }

  private getLatestByKey(key: string) {
    return this.telegramAnswerModel.findOne({ key }, null, {
      sort: { date: -1 },
    });
  }

  public async getToday() {
    return {
      mood: await this.getLatestByKey('mood'),
      sleep: await this.getLatestByKey('watchTimeAsleep'),
    };
  }
}
