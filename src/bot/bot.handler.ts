import { InjectModel } from '@nestjs/mongoose';
import { Ctx, Start, Hears, Update, InjectBot } from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';
import { TelegramSurveyState } from './schema/telegram-survey-state.schema';
import { Model } from 'mongoose';
import { surveys, TelegramQuestion } from './surveys';
import { ConfigService } from '@nestjs/config';
import { TelegramAnswer } from './schema/telegram-answer.schema';
import { differenceInMinutes } from 'date-fns';

interface MatchContext extends Context {
  match: RegExpMatchArray;
}

const defaultKeyboard = {
  '0': 'Terrible',
  '1': 'Bad',
  '2': 'Okay',
  '3': 'Good',
  '4': 'Great',
  '5': 'Excellent',
};

@Update()
// TODO: location in case hass dies
// maybe send a reminder if location is not updated in a long time?
export class BotHandler {
  private questionQueue: TelegramQuestion[] = [];
  private chatId = 0;

  public constructor(
    configService: ConfigService,
    @InjectModel(TelegramSurveyState.name)
    private readonly telegramSurveyStateModel: Model<TelegramSurveyState>,
    @InjectModel(TelegramAnswer.name)
    private readonly telegramAnswerModel: Model<TelegramAnswer>,
    @InjectBot() private readonly bot: Telegraf<Context>,
  ) {
    this.chatId = Number(configService.get('TELEGRAM_CHAT_ID'));
  }

  private buildKeyboard(buttons: Record<string, string>) {
    return Markup.keyboard(
      Object.entries(buttons).map((e) => [`${e[0]}. ${e[1]}`]),
    ).oneTime().reply_markup;
  }

  public async sendReminders() {
    for (const survey of surveys) {
      const state = await this.telegramSurveyStateModel.findOne({
        key: survey.key,
      });

      if (!state) continue;

      const differenceInHours = Math.abs(
        differenceInMinutes(state.lastRun, new Date()) / 60,
      );
      let shouldRemind = false;

      if (survey.reminder === 'daily' && differenceInHours >= 24 * 0.95) {
        shouldRemind = true;
      }

      if (survey.reminder === 'every3hours' && differenceInHours >= 3) {
        shouldRemind = true;
      }

      if (shouldRemind) {
        await this.bot.telegram.sendMessage(
          this.chatId,
          `It's time to run /${survey.key} again!`,
        );
        await this.telegramSurveyStateModel.updateOne(
          { _id: state._id },
          { reminderSent: true },
        );
      }
    }
  }

  private async triggerNextQuestion(ctx: Context) {
    // console.log(this.questionQueue);
    const [question] = this.questionQueue;

    if (!question) {
      await ctx.reply('All done! ✨', {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    if (question.type === 'header') {
      await ctx.reply(question.question);
      this.questionQueue.shift();
      this.triggerNextQuestion(ctx);
      return;
    }

    if (question.type === 'range') {
      const buttons = question.buttons ?? defaultKeyboard;

      await ctx.reply(question.question, {
        reply_markup: this.buildKeyboard(buttons),
      });
    }

    if (question.type === 'boolean') {
      const buttons = {
        0: 'No',
        1: 'Yes',
      };

      await ctx.reply(question.question, {
        reply_markup: this.buildKeyboard(buttons),
      });
    }

    if (question.type === 'text' || question.type === 'number') {
      await ctx.reply(question.question);
    }
  }

  @Start()
  public async start(@Ctx() ctx: Context) {
    await ctx.reply('Welcome');
  }

  @Hears(/\/(\w+)/)
  public async startSurvey(@Ctx() ctx: MatchContext) {
    const surveyName = ctx.match[1];
    const survey = surveys.find((e) => e.key === surveyName);
    if (!survey) {
      return 'No survey named ' + surveyName;
    }

    if (this.questionQueue.length) {
      return 'Finish current survey first!';
    }

    this.questionQueue.push(...survey.questions);
    await this.telegramSurveyStateModel.updateOne(
      { key: surveyName },
      { key: surveyName, lastRun: new Date(), reminderSent: false },
      { upsert: true },
    );
    await this.triggerNextQuestion(ctx);
  }

  // TODO: skip

  @Hears(/^([^/].*)$/)
  public async handleResponse(@Ctx() ctx: Context) {
    const [question] = this.questionQueue;

    // wtf?
    if (
      !('message' in ctx.update) ||
      !('text' in ctx.update.message) ||
      question.type === 'header'
    )
      return;

    if (!question) {
      return (
        'No survey is currently selected. Surveys: ' +
        surveys.map((e) => e.key).join(', ')
      );
    }

    let answer: string = '';
    let numberValue: number | undefined;
    console.log(ctx);

    if (question.type === 'number') {
      //@ts-expect-error: checking if a string is a number
      if (isNaN(ctx.update.message.text)) {
        return 'Invalid number';
      }

      numberValue = Number(ctx.update.message.text);
      answer = ctx.update.message.text;
    }

    if (question.type === 'text') {
      if (question.regex && !question.regex.test(ctx.update.message.text)) {
        return 'Invalid input. Response format: ' + question.regex.toString();
      }

      answer = ctx.update.message.text;
    }

    if (question.type === 'boolean' || question.type === 'range') {
      const regex = /^(\d)\.\s(.*)/;

      const match = ctx.update.message.text.match(regex);

      if (!match) return 'Invalid input. Press a button on your keyboard.';

      numberValue = Number(match[1]);
      answer = match[2];
    }

    await this.telegramAnswerModel.insertOne({
      key: question.key,
      answer,
      numberValue,
    });
    this.questionQueue.shift();
    this.triggerNextQuestion(ctx);
  }
}
