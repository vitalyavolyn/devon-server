/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Config } from './schema/config.schema';
import { Integration } from './schema/integration.schema';
import { firstValueFrom } from 'rxjs';
import { Location } from './schema/location.schema';

const CONFIG_BASE_URL = 'hass_base_url';
const CONFIG_DEVICE_NAME = 'hass_device_name';
const CONFIG_API_KEY = 'hass_api_key';

@Injectable()
// TODO: save in a new method
export class HomeassistantGpsService {
  private readonly logger = new Logger(HomeassistantGpsService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Location.name)
    private locationModel: Model<Location>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    @InjectModel(Integration.name) private integrationModel: Model<Integration>,
  ) {}

  private stateToDocument(state: any): Location {
    return {
      source: 'hass',
      date: new Date(state.last_updated),
      latitude: state.attributes.latitude,
      longitude: state.attributes.longitude,
    };
  }

  private async getDeviceState(baseUrl, apiKey, deviceName) {
    const stateResponse = await firstValueFrom(
      this.httpService.get(baseUrl + '/api/states/' + deviceName, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }),
    );

    return stateResponse.data;
  }

  async init([baseUrl, apiKey, deviceName]: [
    string,
    string,
    string,
  ]): Promise<void> {
    if (!baseUrl || !apiKey || !deviceName) {
      throw new Error(
        'Usage: init hass {BASE URL} {long lived api key} {location device name}',
      );
    }

    await this.configModel.deleteOne({ key: CONFIG_BASE_URL });
    await this.configModel.deleteOne({ key: CONFIG_DEVICE_NAME });
    await this.configModel.deleteOne({ key: CONFIG_API_KEY });

    await this.configModel.insertOne({
      key: CONFIG_BASE_URL,
      value: baseUrl,
    });
    await this.configModel.insertOne({
      key: CONFIG_API_KEY,
      value: apiKey,
    });
    await this.configModel.insertOne({
      key: CONFIG_DEVICE_NAME,
      value: deviceName,
    });

    const state = await this.getDeviceState(baseUrl, apiKey, deviceName);
    const doc = this.stateToDocument(state);

    const currentLocation = await this.locationModel.findOne();
    if (currentLocation && currentLocation.date >= doc.date) {
      console.log('Current location is newer, skipping updating it');
    } else {
      await this.locationModel.insertOne(doc);
      console.log(`Updated location from HASS`);
    }

    await this.integrationModel.updateOne(
      { integration: 'hass' },
      {
        integration: 'hass',
        lastSync: new Date(),
        status: 'ok',
      },
      { upsert: true },
    );
  }

  async fetchUpdates() {
    const integrationInfo = await this.integrationModel.findOne({
      integration: 'hass',
    });
    const baseUrlInfo = await this.configModel.findOne({
      key: CONFIG_BASE_URL,
    });
    const apiKeyInfo = await this.configModel.findOne({
      key: CONFIG_API_KEY,
    });
    const deviceNameInfo = await this.configModel.findOne({
      key: CONFIG_DEVICE_NAME,
    });

    if (
      !integrationInfo?.lastSync ||
      !deviceNameInfo?.value ||
      !apiKeyInfo?.value ||
      !baseUrlInfo?.value
    ) {
      this.logger.error(
        "Can't find api key or last sync date. May need to re-add integration",
      );
      return;
    }

    const state = await this.getDeviceState(
      baseUrlInfo.value,
      apiKeyInfo.value,
      deviceNameInfo.value,
    );
    const doc = this.stateToDocument(state);

    const currentLocation = await this.locationModel.findOne();
    if (currentLocation && currentLocation.date >= doc.date) {
      this.logger.log('Current location is newer, skipping updating it');
    } else {
      await this.locationModel.deleteMany({});
      await this.locationModel.insertOne(doc);
      this.logger.log(`Updated location from HASS`);
    }
  }
}
