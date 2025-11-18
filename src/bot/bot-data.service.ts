import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TelegramAnswer } from './schema/telegram-answer.schema';
import { ShortcutsBodyDto } from 'src/api/dto/shortcuts-body.dto';
import { setHours, subDays } from 'date-fns';

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

  public async saveShortcutsData(data: ShortcutsBodyDto) {
    await this.telegramAnswerModel.create({
      key: 'watchTimeAsleep',
      answer: data.sleep,
    });
    const stepsDate = setHours(subDays(new Date(), 1), 23);
    await this.telegramAnswerModel.create({
      key: 'dailySteps',
      answer: data.steps,
      date: stepsDate,
      numberValue: Number(data.steps),
    });
    this.logger.log('Received new data from Apple Shortcuts');
  }
}
