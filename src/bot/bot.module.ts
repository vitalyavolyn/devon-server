import { forwardRef, Module } from '@nestjs/common';
import { IntegrationModule } from '../integration/integration.module';
import { BotHandler } from './bot.handler';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TelegramSurveyState,
  TelegramSurveyStateSchema,
} from './schema/telegram-survey-state.schema';
import {
  TelegramAnswer,
  TelegramAnswerSchema,
} from './schema/telegram-answer.schema';
import { BotDataService } from './bot-data.service';
import { BotSchedulerService } from './bot-scheduler.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TelegramSurveyState.name, schema: TelegramSurveyStateSchema },
      { name: TelegramAnswer.name, schema: TelegramAnswerSchema },
    ]),
    forwardRef(() => IntegrationModule),
  ],
  controllers: [],
  providers: [BotHandler, BotDataService, BotSchedulerService],
  exports: [BotDataService, BotHandler],
})
export class BotModule {}
