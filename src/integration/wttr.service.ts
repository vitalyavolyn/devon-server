/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import { Wttr } from './schema/wttr.schema';

@Injectable()
export class WttrService {
  private readonly logger = new Logger(WttrService.name);

  public constructor(
    private readonly httpService: HttpService,
    @InjectModel(Location.name)
    private readonly locationModel: Model<Location>,
    @InjectModel(Wttr.name) private readonly wttrModel: Model<Wttr>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    @InjectModel(Integration.name) private integrationModel: Model<Integration>,
  ) {}

  public getToday() {
    return this.wttrModel.findOne({
      date: new Date().toLocaleDateString('en-CA'),
      current: { $exists: false },
    });
  }

  public getCurrent() {
    return this.wttrModel.findOne({
      current: true,
    });
  }

  private processSingleDay(report): Partial<Wttr> {
    return {
      minTempC: report.mintempC,
      maxTempC: report.maxtempC,
      date: report.date,
    };
  }

  private wttrToDocuments(state: any): Wttr[] {
    const area = state.nearest_area[0];

    // special doc for current temp
    const currentTemp = state.current_condition[0].temp_C;
    const currentWttr: Wttr = {
      minTempC: currentTemp,
      maxTempC: currentTemp,
      date: new Date(),
      areaName: area?.areaName?.[0].value,
      areaCountry: area?.country?.[0].value,
      areaLatitude: area.latitude,
      areaLongitude: area.longitude,
      current: true,
    };

    return state.weather
      .map((report) => ({
        ...this.processSingleDay(report),
        areaName: area?.areaName?.[0].value,
        areaCountry: area?.country?.[0].value,
        areaLatitude: area.latitude,
        areaLongitude: area.longitude,
      }))
      .concat([currentWttr]) as Wttr[];
  }

  private async getReports(latitude, longitude) {
    const stateResponse = await firstValueFrom(
      this.httpService.get(`https://wttr.in/${latitude},${longitude}`, {
        params: { format: 'j1', lang: 'en' },
      }),
    );

    return stateResponse.data;
  }

  public async fetchUpdates() {
    const integrationInfo = await this.integrationModel.findOne({
      integration: 'wttr',
    });
    const location = await this.locationModel.findOne();

    if (!location) {
      if (integrationInfo) this.logger.error('No location present');
      return;
    }

    const reports = await this.getReports(
      location.latitude,
      location.longitude,
    );
    const docs = this.wttrToDocuments(reports);

    await this.wttrModel.deleteMany({ date: { $in: docs.map((e) => e.date) } });
    await this.wttrModel.deleteMany({ current: true });
    await this.wttrModel.insertMany(docs);

    this.logger.log('Weather updated');
  }
}
