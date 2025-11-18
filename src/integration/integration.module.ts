import { Module } from '@nestjs/common';
import { MyshowsService } from './myshows.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { MyshowsSchema } from './schema/myshows.schema';
import { ConfigSchema } from './schema/config.schema';
import { IntegrationSchema } from './schema/integration.schema';
import { SchedulerService } from './scheduler.service';
import { LetterboxdSchema } from './schema/letterboxd.schema';
import { LetterboxdService } from './letterboxd.service';
import { LastfmSchema } from './schema/lastfm.schema';
import { LastfmService } from './lastfm.service';
import { RetroachievementsSchema } from './schema/retroachievements.schema';
import { RetroachievementsService } from './retroachievements.service';
import { LocationSchema } from './schema/location.schema';
import { HomeassistantGpsService } from './homeassistant-gps.service';
import { WttrSchema } from './schema/wttr.schema';
import { WttrService } from './wttr.service';
import { WakatimeSchema } from './schema/wakatime.schema';
import { WakatimeService } from './wakatime.service';
import { WordleSchema } from './schema/wordle.schema';
import { WordleService } from './wordle.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 20000,
        maxRedirects: 5,
      }),
    }),
    MongooseModule.forFeature([
      { name: 'Myshows', schema: MyshowsSchema },
      { name: 'Config', schema: ConfigSchema },
      { name: 'Integration', schema: IntegrationSchema },
      { name: 'Letterboxd', schema: LetterboxdSchema },
      { name: 'Lastfm', schema: LastfmSchema },
      { name: 'Retroachievements', schema: RetroachievementsSchema },
      { name: 'Location', schema: LocationSchema },
      { name: 'Wttr', schema: WttrSchema },
      { name: 'Wakatime', schema: WakatimeSchema },
      { name: 'Wordle', schema: WordleSchema },
    ]),
  ],
  controllers: [],
  providers: [
    MyshowsService,
    LetterboxdService,
    LastfmService,
    SchedulerService,
    RetroachievementsService,
    HomeassistantGpsService,
    WttrService,
    WakatimeService,
    WordleService,
  ],
  exports: [
    MyshowsService,
    LetterboxdService,
    LastfmService,
    RetroachievementsService,
    HomeassistantGpsService,
    WttrService,
    WakatimeService,
    WordleService,
  ],
})
export class IntegrationModule {}
