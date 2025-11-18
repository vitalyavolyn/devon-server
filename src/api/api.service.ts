import { Injectable } from '@nestjs/common';
import { GetRangeParamsDto } from './dto/get-range-params.dto';
import {
  parseISO,
  addDays,
  subDays,
  differenceInDays,
  format,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { WttrDocument } from 'src/integration/schema/wttr.schema';
import { tz } from '@date-fns/tz';
import { LastfmDocument } from 'src/integration/schema/lastfm.schema';
import { LastfmService } from 'src/integration/lastfm.service';
import { LetterboxdService } from 'src/integration/letterboxd.service';
import { MyshowsService } from 'src/integration/myshows.service';
import { RetroachievementsService } from 'src/integration/retroachievements.service';
import { WakatimeService } from 'src/integration/wakatime.service';
import { LetterboxdDocument } from 'src/integration/schema/letterboxd.schema';
import { MyshowsDocument } from 'src/integration/schema/myshows.schema';
import { RetroachievementsDocument } from 'src/integration/schema/retroachievements.schema';
import { WakatimeDocument } from 'src/integration/schema/wakatime.schema';
import { WttrService } from 'src/integration/wttr.service';
import { BotDataService } from 'src/bot/bot-data.service';
import { ShortcutsBodyDto } from './dto/shortcuts-body.dto';
import { WordleService } from 'src/integration/wordle.service';

// TODO: move to types
// TODO: organize props
export interface Day {
  date: string;
  displayDate: string;
  activities: any[];
  weather?: WttrDocument;
}

export interface Activity {
  id: string;
  type: string;
  service: string;
}

export interface MusicActivity extends Activity {
  type: 'music';
  title: string;
  artist: string;
  time: Date;
}

export interface MovieActivity extends Activity {
  type: 'movie';
  title: string;
  year: number;
  rating?: number;
  time: Date;
}

// missing epName
export interface TvActivity extends Activity {
  type: 'tv';
  title: string;
  code: string;
  time: Date;
}

export interface AchievementActivity extends Activity {
  type: 'achievement';
  game: string;
  achievement: string;
  description: string;
  points: number;
  badgeUrl: string;
  time: Date;
}

export interface CodeActivity extends Activity {
  type: 'coding';
  project: string;
  duration: number;
}

// TODO: make configurable
const TIMEZONE = 'Asia/Oral';

@Injectable()
export class ApiService {
  public constructor(
    private readonly myshowsService: MyshowsService,
    private readonly letterboxdService: LetterboxdService,
    private readonly lastfmService: LastfmService,
    private readonly retroachievementsService: RetroachievementsService,
    private readonly wakatimeService: WakatimeService,
    private readonly wttrService: WttrService,
    private readonly wordleService: WordleService,
    private readonly botDataService: BotDataService,
  ) {}

  public getHello(): string {
    return 'Hello World!';
  }

  // TODO: refactor
  // TODO: links
  private async getMusicActivities(
    start: Date,
    end: Date,
  ): Promise<MusicActivity[]> {
    const records = (await this.lastfmService.getRange(
      start,
      end,
    )) as unknown as LastfmDocument[];

    return records.map((e) => ({
      type: 'music',
      title: e.title,
      artist: e.artist,
      time: e.scrobbledAt,
      service: 'Last.fm',
      id: e._id.toString(),
    }));
  }

  private async getMovieActivities(
    start: Date,
    end: Date,
  ): Promise<MovieActivity[]> {
    const records = (await this.letterboxdService.getRange(
      start,
      end,
    )) as unknown as LetterboxdDocument[];

    return records.map((e) => ({
      type: 'movie',
      title: e.movieName,
      // todo: not needed
      year: Number(e.releasedYear),
      time: e.watchedDate,
      service: 'Letterboxd',
      id: e._id.toString(),
      // todo: fuck
      rating: e.rating ?? undefined,
    }));
  }

  private async getTvActivities(start: Date, end: Date): Promise<TvActivity[]> {
    const records = (await this.myshowsService.getRange(
      start,
      end,
    )) as unknown as MyshowsDocument[];

    return records.map((e) => ({
      type: 'tv',
      title: e.showName,
      code: e.episodeCode + ' ' + e.episodeName,
      time: e.watchedDate,
      service: 'MyShows.me',
      id: e._id.toString(),
    }));
  }

  private async getAchievementActivities(
    start: Date,
    end: Date,
  ): Promise<AchievementActivity[]> {
    const records = (await this.retroachievementsService.getRange(
      start,
      end,
    )) as unknown as RetroachievementsDocument[];

    return records.map((e) => ({
      type: 'achievement',
      game: e.game,
      achievement: e.title,
      description: e.description,
      points: e.points,
      badgeUrl: e.image,
      time: e.date,
      service: 'RetroAchievements',
      id: e._id.toString(),
    }));
  }

  private async getCodingActivities(
    start: Date,
    end: Date,
  ): Promise<CodeActivity[]> {
    const records = (await this.wakatimeService.getRange(
      start,
      end,
    )) as unknown as WakatimeDocument[];

    return records.map((e) => ({
      type: 'coding',
      project: e._id.toString(), // !!! костыль
      duration: Math.floor(e.duration / 60),
      service: 'WakaTime',
      id: e._id.toString(),
    }));
  }

  private async generateDayData(date: Date): Promise<Day> {
    const start = startOfDay(date, { in: tz(TIMEZONE) });
    const end = endOfDay(date, { in: tz(TIMEZONE) });

    const activities = (
      await Promise.all([
        this.getMusicActivities(start, end),
        this.getMovieActivities(start, end),
        this.getTvActivities(start, end),
        this.getAchievementActivities(start, end),
        this.getCodingActivities(start, end),
      ])
    ).flat();

    return {
      date: format(date, 'yyyy-MM-dd'),
      displayDate: format(date, 'EEEE, MMMM d, yyyy'),
      activities,
    };
  }

  public async getRange(params: GetRangeParamsDto) {
    const today = new Date();
    const { startDate, endDate, limit } = params;

    // Parse start and end dates
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      // If both dates provided, use them directly
      start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
      end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

      // Ensure start is before end
      if (start > end) {
        [start, end] = [end, start];
      }
    } else if (startDate) {
      // If only start date provided, use limit to determine end date
      start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
      end = addDays(start, (limit || 10) - 1);
    } else if (endDate) {
      // If only end date provided, use limit to determine start date
      end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
      start = subDays(end, (limit || 10) - 1);
    } else {
      // If no dates provided, use today and go back by limit
      end = today;
      start = subDays(today, (limit || 10) - 1);
    }

    // Calculate number of days to generate
    const dayCount = differenceInDays(end, start) + 1;

    // Generate data for each day in the range
    const result: Day[] = [];
    let currentDate = new Date(start);

    for (let i = 0; i < dayCount; i++) {
      result.push(await this.generateDayData(currentDate));
      currentDate = addDays(currentDate, 1);
    }

    // Sort by date (newest first)
    result.sort((a, b) => {
      return parseISO(b.date).getTime() - parseISO(a.date).getTime();
    });

    return result;
  }

  public async getToday() {
    // TODO: i forgor why is there getLatest in "today"
    return {
      wttr: await this.wttrService.getToday(),
      lastfm: await this.lastfmService.getToday(),
      letterboxd: await this.letterboxdService.getLatest(),
      myshows: await this.myshowsService.getLatest(),
      wordle: await this.wordleService.getLatest(),
      ...(await this.botDataService.getToday()),
    };
  }

  // TODO: prevent duplicate executions
  public async shortcutsWebhook(body: ShortcutsBodyDto) {
    await this.botDataService.saveShortcutsData(body);
    return 'ok';
  }
}
