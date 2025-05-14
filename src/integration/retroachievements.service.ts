/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Config } from './schema/config.schema';
import { Integration } from './schema/integration.schema';
import { firstValueFrom } from 'rxjs';
import { Retroachievements } from './schema/retroachievements.schema';

const BASE_URL = 'https://retroachievements.org';
const CONFIG_ULID_KEY = 'retroachievements_ulid';
const CONFIG_API_KEY = 'retroachievements_api_key';

@Injectable()
export class RetroachievementsService {
  private readonly logger = new Logger(RetroachievementsService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Retroachievements.name)
    private retroachievementsModel: Model<Retroachievements>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    @InjectModel(Integration.name) private integrationModel: Model<Integration>,
  ) {}

  private achievementToDocument(achievement: any): Retroachievements {
    return {
      image: BASE_URL + achievement.BadgeURL,
      date: new Date(achievement.Date),
      description: achievement.Description,
      title: achievement.Title,
      gameUrl: BASE_URL + achievement.GameURL,
      isHardcore: Boolean(achievement.HardcoreMode),
      points: achievement.Points,
    };
  }

  async init([ulid, apiKey]: [string, string]): Promise<void> {
    if (!ulid || !apiKey) {
      throw new Error('Usage: init retroachievements {ULID} {api key}');
    }

    await this.retroachievementsModel.deleteMany({});
    await this.configModel.deleteOne({ key: CONFIG_ULID_KEY });
    await this.configModel.deleteOne({ key: CONFIG_API_KEY });

    await this.configModel.insertOne({
      key: CONFIG_ULID_KEY,
      value: ulid,
    });
    await this.configModel.insertOne({
      key: CONFIG_API_KEY,
      value: apiKey,
    });

    const achievementsResponse = await firstValueFrom(
      this.httpService.get(
        BASE_URL + '/API/API_GetAchievementsEarnedBetween.php',
        {
          params: {
            u: ulid,
            y: apiKey,
            f: 0,
            t: Math.floor(new Date().getTime() / 1000),
          },
        },
      ),
    );

    const records = achievementsResponse.data.map((achievement) =>
      this.achievementToDocument(achievement),
    ) as Retroachievements[];

    await this.retroachievementsModel.insertMany(records);
    console.log(`Added ${records.length} achievements`);

    await this.integrationModel.updateOne(
      { integration: 'retroachievements' },
      {
        integration: 'retroachievements',
        lastSync: new Date(),
        status: 'ok',
      },
      { upsert: true },
    );
  }

  async fetchUpdates() {
    const integrationInfo = await this.integrationModel.findOne({
      integration: 'retroachievements',
    });
    const loginInfo = await this.configModel.findOne({
      key: CONFIG_ULID_KEY,
    });
    const apiKeyInfo = await this.configModel.findOne({
      key: CONFIG_API_KEY,
    });

    if (!integrationInfo) {
      return;
    }

    if (!integrationInfo?.lastSync || !loginInfo?.value) {
      this.logger.error(
        "Can't find username, api key or last sync date. May need to re-add integration",
      );
      return;
    }

    const achievementsResponse = await firstValueFrom(
      this.httpService.get(
        BASE_URL + '/API/API_GetAchievementsEarnedBetween.php',
        {
          params: {
            u: loginInfo.value,
            y: apiKeyInfo?.value,
            f: Math.floor(integrationInfo.lastSync.getTime() / 1000),
            t: Math.floor(new Date().getTime() / 1000),
          },
        },
      ),
    );

    if (achievementsResponse.data.length === 0) {
      return;
    }

    const records = achievementsResponse.data.map((achievement) =>
      this.achievementToDocument(achievement),
    ) as Retroachievements[];

    if (records.length) {
      this.logger.log(`Saving ${records.length} new achievements`);
      await this.retroachievementsModel.insertMany(records);
    }
  }
}
