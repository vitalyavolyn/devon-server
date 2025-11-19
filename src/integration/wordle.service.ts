/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { firstValueFrom } from 'rxjs';
import { Model } from 'mongoose';
import { Config } from './schema/config.schema';
import { Integration } from './schema/integration.schema';
import { Wordle } from './schema/wordle.schema';

const CONFIG_COOKIE_KEY = 'wordle_cookie';

@Injectable()
export class WordleService {
  private readonly logger = new Logger(WordleService.name);

  public constructor(
    private readonly httpService: HttpService,
    @InjectModel(Config.name) private configModel: Model<Config>,
    @InjectModel(Integration.name) private integrationModel: Model<Integration>,
    @InjectModel(Wordle.name) private wordleModel: Model<Wordle>,
  ) {}

  public async getLatest() {
    const wordle = await this.wordleModel
      .findOne({}, null, {
        sort: { date: -1 },
      })
      .lean();

    if (!wordle) {
      return null;
    }

    return { ...wordle, shareText: this.makeShareText(wordle) };
  }

  public async getRange(start: Date, end: Date): Promise<any[]> {
    const wordles = await this.wordleModel
      .find({
        date: { $gte: start, $lt: end },
      })
      .lean();

    return wordles.map((wordle) => ({
      ...wordle,
      shareText: this.makeShareText(wordle),
    }));
  }

  public async init([cookie]: [string]): Promise<void> {
    if (!cookie) {
      throw new Error(
        'Usage: init wordle {cookie}. Get it by doing document.cookie on the wordle page.',
      );
    }

    await this.wordleModel.deleteMany({});
    await this.configModel.deleteOne({ key: CONFIG_COOKIE_KEY });

    await this.configModel.insertOne({
      key: CONFIG_COOKIE_KEY,
      value: cookie,
    });

    console.log('Saved cookies. Fetching latest game...');

    const gameState = await this.fetchLatest(cookie);
    if (gameState) {
      this.logger.log('Got latest played game, saving');
      await this.wordleModel.create({
        date: new Date(),
        ...gameState,
      });
    }

    await this.integrationModel.updateOne(
      { integration: 'wordle' },
      {
        integration: 'wordle',
        lastSync: new Date(),
        status: 'ok',
      },
      { upsert: true },
    );
  }

  private makeShareBoxes(solution: string, words: string[]) {
    const green = '🟩';
    const yellow = '🟨';
    const gray = '⬛️';

    const wordLen = solution.length;
    const lines: string[] = [];

    for (const guess of words) {
      if (!guess) break;

      // letter counts for yellows
      const remaining = {};
      for (const ch of solution) remaining[ch] = (remaining[ch] || 0) + 1;

      // first pass: mark greens
      const result = Array(wordLen).fill(gray);
      for (let i = 0; i < wordLen; i++) {
        if (guess[i] === solution[i]) {
          result[i] = green;
          remaining[guess[i]]--;
        }
      }

      // second pass: mark yellows
      for (let i = 0; i < wordLen; i++) {
        if (result[i] !== green) {
          const ch = guess[i];
          if (remaining[ch] > 0) {
            result[i] = yellow;
            remaining[ch]--;
          }
        }
      }

      lines.push(result.join(''));
    }

    return lines.join('\n');
  }

  private makeShareText(wordle: Wordle) {
    const index = wordle.boardState.filter(Boolean).length;
    return (
      `Wordle ${wordle.day.toLocaleString('en-US')} ${wordle.status === 'WIN' ? index : 'X'}/6${wordle.hardMode ? '*' : ''}\n\n` +
      this.makeShareBoxes(wordle.solution, wordle.boardState)
    );
  }

  private async fetchLatest(cookie: string) {
    const latestStateResponse = await firstValueFrom(
      this.httpService.get(
        'https://www.nytimes.com/svc/games/state/wordleV2/latest',
        { headers: { Cookie: cookie } },
      ),
    );

    this.logger.log(latestStateResponse.data);
    const printDate = latestStateResponse.data.print_date;
    const { status, hardMode, boardState } = latestStateResponse.data.game_data;

    // TODO: not sure about losses!
    if (!['WIN', 'LOSS'].includes(status)) {
      return null;
    }

    const wordleAnswer = await firstValueFrom(
      this.httpService.get(
        `https://www.nytimes.com/svc/wordle/v2/${printDate}.json`,
        { headers: { Cookie: cookie } },
      ),
    );

    const { solution, days_since_launch: day } = wordleAnswer.data as {
      solution: string;
      days_since_launch: number;
    };

    return {
      shareText: boardState,
      solution,
      day,
      hardMode,
      status,
      boardState,
    };
  }

  public async fetchUpdates() {
    const integrationInfo = await this.integrationModel.findOne({
      integration: 'wordle',
    });
    const cookieObj = await this.configModel.findOne({
      key: CONFIG_COOKIE_KEY,
    });

    if (!integrationInfo) {
      return;
    }

    if (!integrationInfo?.lastSync || !cookieObj?.value) {
      this.logger.error(
        "Can't find cookies or last sync date. May need to re-add integration",
      );
      return;
    }

    const latestGame = await this.getLatest();

    const gameState = await this.fetchLatest(cookieObj.value);
    if (gameState) {
      if (latestGame && latestGame.day === gameState.day) {
        return;
      }

      this.logger.log('Got latest played game, saving');
      await this.wordleModel.create({
        date: new Date(),
        ...gameState,
      });
    }
  }
}
