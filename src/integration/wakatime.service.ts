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
import { Wakatime } from './schema/wakatime.schema';

const BASE_URL = 'https://wakatime.com/api/v1';
const CONFIG_API_KEY = 'wakatime_api_key';

@Injectable()
export class WakatimeService {
  private readonly logger = new Logger(WakatimeService.name);

  public constructor(
    private readonly httpService: HttpService,
    @InjectModel(Wakatime.name)
    private wakatimeModel: Model<Wakatime>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    @InjectModel(Integration.name) private integrationModel: Model<Integration>,
  ) {}

  public async getRange(start: Date, end: Date): Promise<any[]> {
    // return await this.wakatimeModel.find({
    //   date: { $gte: start, $lt: end },
    // });

    return await this.wakatimeModel.aggregate([
      {
        $match: {
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: '$project',
          duration: {
            $sum: '$duration',
          },
        },
      },
    ]);
  }

  private rawDataToRecord(duration: any): Wakatime {
    return {
      duration: duration.duration,
      project: duration.project,
      date: new Date(Math.floor(duration.time * 1000)),
    };
  }

  public async init([apiKey]: [string, string]): Promise<void> {
    if (!apiKey) {
      throw new Error('Usage: init wakatime {api key}');
    }

    await this.wakatimeModel.deleteMany({});
    await this.configModel.deleteOne({ key: CONFIG_API_KEY });

    await this.configModel.insertOne({
      key: CONFIG_API_KEY,
      value: apiKey,
    });

    // TODO: backfilling
    const date = new Date().toLocaleDateString('en-CA');
    const durations = await this.getDurationsToday(date, apiKey);

    if (durations.length) {
      console.log(`Saving ${durations.length} new sessions`);
      await this.wakatimeModel.insertMany(durations);
    }

    await this.integrationModel.updateOne(
      { integration: 'wakatime' },
      {
        integration: 'wakatime',
        lastSync: new Date(),
        status: 'ok',
      },
      { upsert: true },
    );
  }

  private async getDurationsToday(date, apiKey): Promise<Wakatime[]> {
    const durationsResponse = await firstValueFrom(
      this.httpService.get(BASE_URL + '/users/current/durations', {
        params: {
          date,
        },
        headers: {
          Authorization: `Basic ${btoa(apiKey)}`,
        },
      }),
    );

    return durationsResponse.data.data.map((duration) =>
      this.rawDataToRecord(duration),
    ) as Wakatime[];
  }

  public async fetchUpdates() {
    const integrationInfo = await this.integrationModel.findOne({
      integration: 'wakatime',
    });
    const apiKeyInfo = await this.configModel.findOne({
      key: CONFIG_API_KEY,
    });

    if (!integrationInfo) {
      return;
    }

    if (!integrationInfo?.lastSync || !apiKeyInfo?.value) {
      this.logger.error(
        "Can't find api key or last sync date. May need to re-add integration",
      );
      return;
    }

    const date = new Date().toLocaleDateString('en-CA');
    const records = await this.getDurationsToday(date, apiKeyInfo.value);
    // const records = (await this.getDurationsToday(apiKeyInfo.value)).filter(
    //   (e: Wakatime) => {
    //     return e.date >= integrationInfo.lastSync;
    //   },
    // );

    if (records.length) {
      await this.wakatimeModel.deleteMany({
        date: { $in: records.map((e) => e.date) },
      });
      // this.logger.log(`Replacing today's sessions (${records.length})`);
      await this.wakatimeModel.insertMany(records);
    }
  }
}
