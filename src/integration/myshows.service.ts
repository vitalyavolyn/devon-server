/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { firstValueFrom } from 'rxjs';
import { Myshows } from './schema/myshows.schema';
import { Model } from 'mongoose';
import { Config } from './schema/config.schema';
import { Integration } from './schema/integration.schema';

const LOGIN_URL = 'https://en.myshows.me/oauth/token';
const RPC_URL = 'https://api.myshows.me/v2/rpc/';
const IOS_APP_SECRET = 'JVjKTh7uVcPS0JGy8EAqbtR4';
const CONFIG_REFRESH_TOKEN_KEY = 'myshows_refresh_token';

// TODO: move
interface TokenInfo {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token: string;
}

@Injectable()
export class MyshowsService {
  private readonly logger = new Logger(MyshowsService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Myshows.name) private myshowsModel: Model<Myshows>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    @InjectModel(Integration.name) private integrationModel: Model<Integration>,
  ) {}

  private async getTokenByPassword(
    login: string,
    password: string,
  ): Promise<TokenInfo> {
    const tokenResponse = await firstValueFrom(
      this.httpService.post(
        LOGIN_URL,
        {
          scope: 'basic',
          client_id: 'myshows_ios',
          password,
          username: login,
          client_secret: IOS_APP_SECRET,
          grant_type: 'password',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    return tokenResponse.data as TokenInfo;
  }

  private async getTokenByRefreshToken(
    refreshToken: string,
  ): Promise<TokenInfo> {
    const tokenResponse = await firstValueFrom(
      this.httpService.post(
        LOGIN_URL,
        {
          scope: 'basic',
          client_id: 'myshows_ios',
          refresh_token: refreshToken,
          client_secret: IOS_APP_SECRET,
          grant_type: 'refresh_token',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    return tokenResponse.data as TokenInfo;
  }

  private async saveRefreshToken(refreshToken: string) {
    await this.configModel.updateOne(
      {
        key: CONFIG_REFRESH_TOKEN_KEY,
      },
      {
        value: refreshToken,
      },
    );
  }

  private getRpcHeaders(accessToken: string) {
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  async init([login, password]: [string, string]): Promise<void> {
    if (!login || !password) {
      throw new Error('Usage: init myshows {login} {password}');
    }

    await this.myshowsModel.deleteMany({});
    await this.configModel.deleteOne({ key: CONFIG_REFRESH_TOKEN_KEY });

    const tokenInfo = await this.getTokenByPassword(login, password);

    await this.configModel.insertOne({
      key: CONFIG_REFRESH_TOKEN_KEY,
      value: tokenInfo.refresh_token,
    });

    console.log('Got a token. Fetching shows...');

    const allShowsResponse = await firstValueFrom(
      this.httpService.post(
        RPC_URL,
        {
          jsonrpc: '2.0',
          method: 'profile.Shows',
          params: {
            login,
          },
          id: 1,
        },
        { headers: this.getRpcHeaders(tokenInfo.access_token) },
      ),
    );

    for (const data of allShowsResponse.data.result) {
      if (!data.watchedEpisodes) continue;
      // console.log(data);

      const req = await firstValueFrom(
        this.httpService.post(
          RPC_URL,
          [
            {
              jsonrpc: '2.0',
              method: 'profile.Episodes',
              params: {
                showId: data.show.id,
              },
              id: 1,
            },
            {
              jsonrpc: '2.0',
              method: 'shows.GetById',
              params: {
                showId: data.show.id,
                withEpisodes: true,
              },
              id: 1,
            },
          ],
          { headers: this.getRpcHeaders(tokenInfo.access_token) },
        ),
      );

      const watchedEpisodesResponse = req.data[0].result;
      const showInfoResponse = req.data[1].result;

      const episodesToSave: Myshows[] = [];

      for (const watchedEpisode of watchedEpisodesResponse) {
        const episode = showInfoResponse.episodes.find(
          (e) => e.id === watchedEpisode.id,
        );

        if (!episode) {
          // console.log(`Episode ${watchedEpisode.id} is gone`);
          continue;
        }

        const ep: Myshows = {
          watchedDate: watchedEpisode.watchDate,
          showName: showInfoResponse.titleOriginal,
          showId: showInfoResponse.id,
          episodeName: episode.title,
          episodeCode: episode.shortName,
          episodeId: episode.id,
        };

        episodesToSave.push(ep);
      }

      await this.myshowsModel.insertMany(episodesToSave);
      console.log(
        `Added ${episodesToSave.length} episodes of ${showInfoResponse.titleOriginal}`,
      );
    }

    await this.integrationModel.updateOne(
      { integration: 'myshows' },
      {
        integration: 'myshows',
        lastSync: new Date(),
        status: 'ok',
      },
      { upsert: true },
    );
  }

  async fetchUpdates() {
    const integrationInfo = await this.integrationModel.findOne({
      integration: 'myshows',
    });
    const refreshTokenObj = await this.configModel.findOne({
      key: CONFIG_REFRESH_TOKEN_KEY,
    });

    if (!integrationInfo) {
      return;
    }

    if (!integrationInfo?.lastSync || !refreshTokenObj?.value) {
      this.logger.error(
        "Can't find refresh token or last sync date. May need to re-add integration",
      );
      return;
    }

    const tokenInfo = await this.getTokenByRefreshToken(refreshTokenObj.value);
    await this.saveRefreshToken(tokenInfo.refresh_token);

    const feedResponse = await firstValueFrom(
      this.httpService.post(
        RPC_URL,
        {
          jsonrpc: '2.0',
          method: 'profile.Feed',
          params: {
            login: '',
          },
          id: 1,
        },
        { headers: this.getRpcHeaders(tokenInfo.access_token) },
      ),
    );

    const newItems: Myshows[] = [];
    for (const feedItem of feedResponse.data.result) {
      if (new Date(feedItem.createdAt) < integrationInfo.lastSync) continue;
      if (feedItem.type !== 'e.check') continue;

      for (const episode of feedItem.episodes) {
        newItems.push({
          watchedDate: feedItem.createdAt,
          showName: feedItem.show.titleOriginal,
          showId: feedItem.show.id,
          episodeName: episode.title,
          episodeCode: episode.shortName,
          episodeId: episode.id,
        });
      }
    }

    if (newItems.length) {
      this.logger.log(`Saving ${newItems.length} new watched episode(s)`);
      await this.myshowsModel.insertMany(newItems);
    }
  }
}
