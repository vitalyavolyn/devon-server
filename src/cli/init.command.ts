import { Command, CommandRunner } from 'nest-commander';
import { MyshowsService } from '../integration/myshows.service';
import { Initable } from '../types/initable';
import { LetterboxdService } from '../integration/letterboxd.service';
import { LastfmService } from '../integration/lastfm.service';
import { RetroachievementsService } from '../integration/retroachievements.service';
import { HomeassistantGpsService } from '../integration/homeassistant-gps.service';

@Command({ name: 'init', description: 'Run initial integration setup' })
export class InitCommand extends CommandRunner {
  constructor(
    private readonly myshowsService: MyshowsService,
    private readonly letterboxdService: LetterboxdService,
    private readonly lastfmService: LastfmService,
    private readonly retroachievementsService: RetroachievementsService,
    private readonly homeassistantGpsService: HomeassistantGpsService,
  ) {
    super();
  }

  getService(serviceName: string): Initable | null {
    switch (serviceName) {
      case 'myshows':
        return this.myshowsService;
      case 'letterboxd':
      case 'boxd':
        return this.letterboxdService;
      case 'lastfm':
        return this.lastfmService;
      case 'retroachievements':
      case 'ra':
        return this.retroachievementsService;
      case 'hass':
        return this.homeassistantGpsService;
      default:
        return null;
    }
  }

  async run(passedParams: string[]): Promise<void> {
    const serviceName = passedParams[0];

    if (!serviceName) {
      console.error('Error: no service name provided');
      return;
    }

    const service = this.getService(serviceName);

    if (!service) {
      console.error('No service named', serviceName);
      return;
    }

    try {
      await service.init(passedParams.slice(1));
    } catch (e) {
      console.error('Command resulted in error:');
      console.error(e);
    }
  }
}
