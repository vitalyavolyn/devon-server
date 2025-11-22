/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { parse } from 'csv';
import { join } from 'path';
import * as cheerio from 'cheerio';
import { readFile } from 'fs/promises';
import { Config } from './schema/config.schema';
import { Integration } from './schema/integration.schema';
import { Letterboxd } from './schema/letterboxd.schema';
import { firstValueFrom } from 'rxjs';

const CONFIG_USERNAME_KEY = 'letterboxd_username';

@Injectable()
// TODO: posters?
export class LetterboxdService {
  private readonly logger = new Logger(LetterboxdService.name);

  public constructor(
    private readonly httpService: HttpService,
    @InjectModel(Letterboxd.name) private letterboxdModel: Model<Letterboxd>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    @InjectModel(Integration.name) private integrationModel: Model<Integration>,
  ) {}

  public getLatest() {
    return this.letterboxdModel.findOne({}, null, {
      sort: { watchedDate: -1 },
    });
  }

  public async getRange(start: Date, end: Date): Promise<any[]> {
    return await this.letterboxdModel.find({
      watchedDate: { $gte: start, $lt: end },
    });
  }

  public async init([login, exportPath]: [string, string]): Promise<void> {
    if (!login || !exportPath) {
      throw new Error(
        'Usage: init letterboxd {login} {path to the export folder}',
      );
    }

    await this.letterboxdModel.deleteMany({});
    await this.configModel.deleteOne({ key: CONFIG_USERNAME_KEY });

    await this.configModel.insertOne({
      key: CONFIG_USERNAME_KEY,
      value: login,
    });

    // import movies
    const records: Letterboxd[] = [];
    const diary = await readFile(join(exportPath, 'diary.csv'));
    const diaryParser = parse(diary);

    for await (const record of diaryParser) {
      if (record[0] === 'Date') continue;
      records.push({
        watchedDate: record[7],
        movieName: record[1],
        releasedYear: record[2],
        letterboxdUri: record[3],
        rating: record[4],
        rewatch: record[5] === 'Yes',
      });
    }

    for (const record of records) {
      record.watchedDate = new Date(record.watchedDate);
    }

    await this.letterboxdModel.insertMany(records);

    await this.integrationModel.updateOne(
      { integration: 'letterboxd' },
      {
        integration: 'letterboxd',
        lastSync: new Date(),
        status: 'ok',
      },
      { upsert: true },
    );
  }

  public async fetchUpdates() {
    const integrationInfo = await this.integrationModel.findOne({
      integration: 'letterboxd',
    });
    const loginInfo = await this.configModel.findOne({
      key: CONFIG_USERNAME_KEY,
    });

    if (!integrationInfo) {
      return;
    }

    if (!integrationInfo?.lastSync || !loginInfo?.value) {
      this.logger.error(
        "Can't find username or last sync date. May need to re-add integration",
      );
      return;
    }

    const newItems: Letterboxd[] = [];

    const rssResponse = await firstValueFrom(
      this.httpService.get(`https://letterboxd.com/${loginInfo.value}/rss/`),
    );

    const $ = cheerio.load(rssResponse.data as string, { xml: true });

    const reviews = $('item').toArray();
    for (const review of reviews) {
      const el = $(review);
      const date = new Date(el.find('pubDate').text());

      if (date < integrationInfo.lastSync) continue;

      const url = el.find('link').text().replace(`${loginInfo.value}/`, ''); // janky. also another type of url
      const isRewatch = el.find('letterboxd\\:rewatch').text() === 'Yes';
      const movieName = el.find('letterboxd\\:filmTitle').text();
      const releasedYear = el.find('letterboxd\\:filmYear').text();
      const rating = Number(el.find('letterboxd\\:memberRating').text());

      newItems.push({
        watchedDate: date,
        movieName,
        releasedYear,
        letterboxdUri: url,
        rating,
        rewatch: isRewatch,
      });
    }

    if (newItems.length) {
      this.logger.log(`Saving ${newItems.length} new watched movie(s)`);
      await this.letterboxdModel.insertMany(newItems);
    }
  }
}
