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
const CONFIG_API_KEY = 'hass_api_key';
const CONFIG_GEOCODE_SENSOR = 'hass_geocode_sensor';

@Injectable()
// TODO: save in a new method
export class HomeassistantGpsService {
  private readonly logger = new Logger(HomeassistantGpsService.name);

  public constructor(
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
      latitude: Math.round(state.attributes.location[0] * 100) / 100,
      longitude: Math.round(state.attributes.location[1] * 100) / 100,
      town: state.attributes.locality ?? null,
    };
  }

  private async getDeviceState(baseUrl, apiKey, sensorName) {
    const stateResponse = await firstValueFrom(
      this.httpService.get(baseUrl + '/api/states/' + sensorName, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }),
    );

    return stateResponse.data;
  }

  public async init([baseUrl, apiKey, geocodeSensor]: [
    string,
    string,
    string,
  ]): Promise<void> {
    if (!baseUrl || !apiKey || !geocodeSensor) {
      throw new Error(
        'Usage: init hass {BASE URL} {long lived api key} {geocode sensor name}',
      );
    }

    await this.configModel.deleteOne({ key: CONFIG_BASE_URL });
    await this.configModel.deleteOne({ key: CONFIG_API_KEY });
    await this.configModel.deleteOne({ key: CONFIG_GEOCODE_SENSOR });

    await this.configModel.insertOne({
      key: CONFIG_BASE_URL,
      value: baseUrl,
    });
    await this.configModel.insertOne({
      key: CONFIG_API_KEY,
      value: apiKey,
    });
    await this.configModel.insertOne({
      key: CONFIG_GEOCODE_SENSOR,
      value: geocodeSensor,
    });

    const state = await this.getDeviceState(baseUrl, apiKey, geocodeSensor);
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

  public async fetchUpdates() {
    const integrationInfo = await this.integrationModel.findOne({
      integration: 'hass',
    });
    const baseUrlInfo = await this.configModel.findOne({
      key: CONFIG_BASE_URL,
    });
    const apiKeyInfo = await this.configModel.findOne({
      key: CONFIG_API_KEY,
    });
    const geocodeSensorInfo = await this.configModel.findOne({
      key: CONFIG_GEOCODE_SENSOR,
    });

    if (
      !integrationInfo?.lastSync ||
      !geocodeSensorInfo?.value ||
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
      geocodeSensorInfo.value,
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
