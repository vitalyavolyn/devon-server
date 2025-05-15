import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MyshowsService } from './myshows.service';
import { InjectModel } from '@nestjs/mongoose';
import { Integration } from './schema/integration.schema';
import { Model } from 'mongoose';
import { LetterboxdService } from './letterboxd.service';
import { LastfmService } from './lastfm.service';
import { RetroachievementsService } from './retroachievements.service';
import { HomeassistantGpsService } from './homeassistant-gps.service';
import { WttrService } from './wttr.service';
import { WakatimeService } from './wakatime.service';
import { BotHandler } from 'src/bot/bot.handler';

@Injectable()
// TODO: refactor
// TODO: a method to force trigger all scheduled tasks
export class SchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchedulerService.name);

  public constructor(
    private readonly myshowsService: MyshowsService,
    private readonly letterboxdService: LetterboxdService,
    private readonly lastfmService: LastfmService,
    private readonly retroachievementsService: RetroachievementsService,
    private readonly homeassistantGpsService: HomeassistantGpsService,
    private readonly wttrService: WttrService,
    private readonly wakatimeService: WakatimeService,
    @InjectModel(Integration.name) private integrationModel: Model<Integration>,
    private readonly botHandler: BotHandler,
  ) {}

  public async onApplicationBootstrap() {
    // await Promise.all([
    //   this.updateMyshows(),
    //   this.updateLetterboxd(),
    //   this.updateLastfm(),
    //   this.updateRA(),
    //   this.updateHassGps(),
    //   this.updateWttr(),
    //   this.updateWakatime(),
    // ]);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  private async updateMyshows() {
    // this.logger.log('Updating myshows episodes');
    try {
      await this.myshowsService.fetchUpdates();
      await this.integrationModel.updateOne(
        { integration: 'myshows' },
        { status: 'ok', lastSync: new Date() },
      );
    } catch (e) {
      this.logger.error('Myshows', e);
      await this.integrationModel.updateOne(
        { integration: 'myshows' },
        { status: 'error' },
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  private async updateLetterboxd() {
    // this.logger.log('Updating letterboxd');
    try {
      await this.letterboxdService.fetchUpdates();
      await this.integrationModel.updateOne(
        { integration: 'letterboxd' },
        { status: 'ok', lastSync: new Date() },
      );
    } catch (e) {
      this.logger.error('Letterboxd', e);
      await this.integrationModel.updateOne(
        { integration: 'letterboxd' },
        { status: 'error' },
      );
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  private async updateLastfm() {
    // this.logger.log('Updating lastfm');
    try {
      await this.lastfmService.fetchUpdates();
      await this.integrationModel.updateOne(
        { integration: 'lastfm' },
        { status: 'ok', lastSync: new Date() },
      );
    } catch (e) {
      this.logger.error('Lastfm', e);
      await this.integrationModel.updateOne(
        { integration: 'lastfm' },
        { status: 'error' },
      );
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  private async updateRA() {
    // this.logger.log('Updating RA');
    try {
      await this.retroachievementsService.fetchUpdates();
      await this.integrationModel.updateOne(
        { integration: 'retroachievements' },
        { status: 'ok', lastSync: new Date() },
      );
    } catch (e) {
      this.logger.error('RA', e);
      await this.integrationModel.updateOne(
        { integration: 'retroachievements' },
        { status: 'error' },
      );
    }
  }

  @Cron(CronExpression.EVERY_3_HOURS)
  private async updateHassGps() {
    // this.logger.log('Updating HASS GPS');
    try {
      await this.homeassistantGpsService.fetchUpdates();
      await this.integrationModel.updateOne(
        { integration: 'hass' },
        { status: 'ok', lastSync: new Date() },
      );
    } catch (e) {
      this.logger.error('HASS', e);
      await this.integrationModel.updateOne(
        { integration: 'hass' },
        { status: 'error' },
      );
    }
  }

  @Cron(CronExpression.EVERY_3_HOURS)
  private async updateWttr() {
    // this.logger.log('Updating wttr');
    try {
      await this.wttrService.fetchUpdates();
      await this.integrationModel.updateOne(
        { integration: 'wttr' },
        { status: 'ok', lastSync: new Date() },
      );
    } catch (e) {
      this.logger.error('Wttr', e);
      await this.integrationModel.updateOne(
        { integration: 'wttr' },
        { status: 'error' },
      );
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  private async updateWakatime() {
    // this.logger.log('Updating wakatime');
    try {
      await this.wakatimeService.fetchUpdates();
      await this.integrationModel.updateOne(
        { integration: 'wakatime' },
        { status: 'ok', lastSync: new Date() },
      );
    } catch (e) {
      this.logger.error('Wakatime', e);
      await this.integrationModel.updateOne(
        { integration: 'wakatime' },
        { status: 'error' },
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  private async sendTelegtamReminders() {
    await this.botHandler.sendReminders();
  }
}
