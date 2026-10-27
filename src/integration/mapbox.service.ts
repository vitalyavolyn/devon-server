/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Config } from './schema/config.schema';
import { Initable } from '../types';

const CONFIG_API_KEY = 'mapbox_api_key';

@Injectable()
export class MapboxService implements Initable {
  private readonly logger = new Logger(MapboxService.name);

  public constructor(
    private readonly httpService: HttpService,
    @InjectModel(Config.name) private configModel: Model<Config>,
  ) {}

  public async init([apiKey]: [string]): Promise<void> {
    if (!apiKey) {
      throw new Error('Usage: init mapbox {access token}');
    }

    await this.configModel.deleteOne({ key: CONFIG_API_KEY });
    await this.configModel.insertOne({ key: CONFIG_API_KEY, value: apiKey });
  }

  public async getPlaceName(
    latitude: number,
    longitude: number,
  ): Promise<string | undefined> {
    const apiKeyInfo = await this.configModel.findOne({ key: CONFIG_API_KEY });
    if (!apiKeyInfo?.value) {
      return undefined;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          'https://api.mapbox.com/search/geocode/v6/reverse',
          {
            params: {
              longitude,
              latitude,
              types: 'place',
              language: 'en',
              access_token: apiKeyInfo.value,
            },
          },
        ),
      );

      return response.data?.features?.[0]?.properties?.name;
    } catch (e) {
      this.logger.warn('Could not reverse geocode place name from Mapbox', e);
      return undefined;
    }
  }
}
