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
import { Lastfm } from './schema/lastfm.schema';

const CONFIG_USERNAME_KEY = 'lastfm_username';
const CONFIG_API_KEY = 'lastfm_api_key';

@Injectable()
// TODO: posters?
export class LastfmService {
  private readonly logger = new Logger(LastfmService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Lastfm.name) private lastfmModel: Model<Lastfm>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    @InjectModel(Integration.name) private integrationModel: Model<Integration>,
  ) {}

  private recentTrackToDocument(track: any): Lastfm | null {
    if (track['@attr']?.nowplaying) return null;

    return {
      image: track.image?.find((e) => e.size === 'medium')?.['#text'],
      scrobbledAt: new Date(track.date.uts * 1000),
      artist: track.artist['#text'],
      title: track.name,
      url: track.url,
    };
  }

  async init([login, apiKey]: [string, string]): Promise<void> {
    if (!login || !apiKey) {
      throw new Error('Usage: init lastfm {login} {api key}');
    }

    await this.lastfmModel.deleteMany({});
    await this.configModel.deleteOne({ key: CONFIG_USERNAME_KEY });
    await this.configModel.deleteOne({ key: CONFIG_API_KEY });

    await this.configModel.insertOne({
      key: CONFIG_USERNAME_KEY,
      value: login,
    });
    await this.configModel.insertOne({
      key: CONFIG_API_KEY,
      value: apiKey,
    });

    let page = 1;
    let count = 0;

    while (true) {
      const recentTracksResponse = await firstValueFrom(
        this.httpService.get('http://ws.audioscrobbler.com/2.0/', {
          params: {
            page,
            api_key: apiKey,
            method: 'user.getrecenttracks',
            user: login,
            format: 'json',
            limit: 200,
          },
        }),
      );

      if (recentTracksResponse.data.recenttracks.track.length === 0) {
        break;
      }

      console.log(recentTracksResponse.data.recenttracks.track);
      const records = recentTracksResponse.data.recenttracks.track
        .map((track) => this.recentTrackToDocument(track))
        .filter(Boolean) as Lastfm[];

      await this.lastfmModel.insertMany(records);
      count += records.length;
      console.log(
        `Added ${count} out of ${recentTracksResponse.data.recenttracks['@attr'].total}`,
      );
      page++;
    }

    const records: Lastfm[] = [];

    await this.lastfmModel.insertMany(records);

    await this.integrationModel.updateOne(
      { integration: 'lastfm' },
      {
        integration: 'lastfm',
        lastSync: new Date(),
        status: 'ok',
      },
      { upsert: true },
    );
  }

  async fetchUpdates() {
    const integrationInfo = await this.integrationModel.findOne({
      integration: 'lastfm',
    });
    const loginInfo = await this.configModel.findOne({
      key: CONFIG_USERNAME_KEY,
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

    const recentTracksResponse = await firstValueFrom(
      this.httpService.get('http://ws.audioscrobbler.com/2.0/', {
        params: {
          from: Math.floor(integrationInfo.lastSync.getTime() / 1000),
          api_key: apiKeyInfo?.value,
          method: 'user.getrecenttracks',
          user: loginInfo.value,
          format: 'json',
          limit: 200,
        },
      }),
    );

    if (recentTracksResponse.data.recenttracks.track.length === 0) {
      return;
    }

    const records = recentTracksResponse.data.recenttracks.track
      .map((track) => this.recentTrackToDocument(track))
      .filter(Boolean) as Lastfm[];

    if (records.length) {
      this.logger.log(`Saving ${records.length} new scrobbles`);
      await this.lastfmModel.insertMany(records);
    }
  }
}
