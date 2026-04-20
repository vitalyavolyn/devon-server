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
import { TelegramAnswer } from '../bot/schema/telegram-answer.schema';
import { endOfDay, startOfDay } from 'date-fns';
import { InjectBot } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

const CONFIG_BASE_URL = 'hass_base_url';
const CONFIG_API_KEY = 'hass_api_key';
const CONFIG_GEOCODE_SENSOR = 'hass_geocode_sensor';
const CONFIG_STEPS_SENSOR = 'hass_steps_sensor';
const CONFIG_SLEEP_SENSOR = 'hass_sleep_sensor';

@Injectable()
// TODO: save in a new method
export class HomeassistantService {
  private readonly logger = new Logger(HomeassistantService.name);

  private readonly chatId: number;

  public constructor(
    private readonly httpService: HttpService,
    @InjectModel(Location.name)
    private locationModel: Model<Location>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    @InjectModel(Integration.name) private integrationModel: Model<Integration>,
    @InjectModel(TelegramAnswer.name)
    private telegramAnswerModel: Model<TelegramAnswer>,
    @InjectBot() private readonly bot: Telegraf,
    configService: ConfigService,
  ) {
    this.chatId = Number(configService.get('TELEGRAM_CHAT_ID'));
  }

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

  public async init([
    baseUrl,
    apiKey,
    geocodeSensor,
    stepsSensor,
    sleepSensor,
  ]: string[]): Promise<void> {
    if (!baseUrl || !apiKey || !geocodeSensor) {
      throw new Error(
        'Usage: init hass {BASE URL} {long lived api key} {geocode sensor name} [steps sensor] [sleep sensor]',
      );
    }

    await this.configModel.deleteOne({ key: CONFIG_BASE_URL });
    await this.configModel.deleteOne({ key: CONFIG_API_KEY });
    await this.configModel.deleteOne({ key: CONFIG_GEOCODE_SENSOR });
    await this.configModel.deleteOne({ key: CONFIG_STEPS_SENSOR });
    await this.configModel.deleteOne({ key: CONFIG_SLEEP_SENSOR });

    await this.configModel.insertOne({ key: CONFIG_BASE_URL, value: baseUrl });
    await this.configModel.insertOne({ key: CONFIG_API_KEY, value: apiKey });
    await this.configModel.insertOne({
      key: CONFIG_GEOCODE_SENSOR,
      value: geocodeSensor,
    });
    if (stepsSensor)
      await this.configModel.insertOne({
        key: CONFIG_STEPS_SENSOR,
        value: stepsSensor,
      });
    if (sleepSensor)
      await this.configModel.insertOne({
        key: CONFIG_SLEEP_SENSOR,
        value: sleepSensor,
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

    await this.fetchHealthData();
    console.log('Fetched initial health data from HASS');
  }

  public async fetchLocationData() {
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
      !geocodeSensorInfo?.value ||
      !apiKeyInfo?.value ||
      !baseUrlInfo?.value
    ) {
      this.logger.error(
        "Can't find hass config. Run: init hass {url} {api_key} {geocode_sensor}",
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

  public async fetchHealthData() {
    const baseUrlInfo = await this.configModel.findOne({
      key: CONFIG_BASE_URL,
    });
    const apiKeyInfo = await this.configModel.findOne({ key: CONFIG_API_KEY });

    if (!apiKeyInfo?.value || !baseUrlInfo?.value) {
      this.logger.error("Can't find hass config for health data");
      return;
    }

    const baseUrl = baseUrlInfo.value;
    const apiKey = apiKeyInfo.value;

    const stepsSensorInfo = await this.configModel.findOne({ key: CONFIG_STEPS_SENSOR });
    const sleepSensorInfo = await this.configModel.findOne({ key: CONFIG_SLEEP_SENSOR });

    let stepsSynced = false;
    try {
      if (!stepsSensorInfo?.value) throw new Error('No steps sensor configured');
      const stepsState = await this.getDeviceState(baseUrl, apiKey, stepsSensorInfo.value);
      const steps = Math.round(parseFloat(stepsState.state));
      if (!isNaN(steps)) {
        const eventDate = new Date(stepsState.attributes.endTime ?? stepsState.last_updated);
        const dayStart = startOfDay(eventDate);
        const dayEnd = endOfDay(eventDate);
        await this.telegramAnswerModel.findOneAndUpdate(
          { key: 'dailySteps', date: { $gte: dayStart, $lte: dayEnd } },
          { key: 'dailySteps', answer: String(steps), numberValue: steps, date: eventDate },
          { upsert: true },
        );
        stepsSynced = true;
      }
    } catch (e) {
      this.logger.warn('Could not sync steps from HASS', e);
    }

    let sleepSynced = false;
    let sleepHHMM = '';
    try {
      if (!sleepSensorInfo?.value) throw new Error('No sleep sensor configured');
      const sleepState = await this.getDeviceState(baseUrl, apiKey, sleepSensorInfo.value);
      const sleepMinutes = Math.round(parseFloat(sleepState.state));
      if (!isNaN(sleepMinutes)) {
        const eventDate = new Date(sleepState.attributes.endTime ?? sleepState.last_updated);
        const dayStart = startOfDay(eventDate);
        const dayEnd = endOfDay(eventDate);
        const h = Math.floor(sleepMinutes / 60);
        const m = sleepMinutes % 60;
        sleepHHMM = `${h}:${String(m).padStart(2, '0')}`;
        const existing = await this.telegramAnswerModel.findOne({
          key: 'watchTimeAsleep',
          date: { $gte: dayStart, $lte: dayEnd },
        });
        await this.telegramAnswerModel.findOneAndUpdate(
          { key: 'watchTimeAsleep', date: { $gte: dayStart, $lte: dayEnd } },
          { key: 'watchTimeAsleep', answer: sleepHHMM, date: eventDate },
          { upsert: true },
        );
        if (!existing) {
          await this.bot.telegram.sendMessage(
            this.chatId,
            `Synced sleep from HA: ${sleepHHMM}`,
          );
        }
        sleepSynced = true;
      }
    } catch (e) {
      this.logger.warn('Could not sync sleep from HASS', e);
    }

    this.logger.log(`Health sync: steps=${stepsSynced}, sleep=${sleepSynced}`);
  }
}
