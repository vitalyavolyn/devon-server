import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { parse } from 'csv';

@Injectable()
// TODO: this was half-written by ChatGPT and then i noticed inconcistency between my Samsung Health app and the CSVs.
// shelved for now.
export class SamsungHealthImporter {
  private readonly logger = new Logger(SamsungHealthImporter.name);

  constructor() {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async import([path]: [string]): Promise<void> {
    if (!path) {
      throw new Error(
        'Usage: import samsung {path to com.samsung.shealth.sleep.csv}',
      );
    }

    const sleepData: Record<string, number> = {};

    fs.createReadStream(path)
      .pipe(
        parse({
          from_line: 3,
          trim: true,
        }),
      )
      .on('data', (row) => {
        console.log(row);
        const start = new Date(row[48]);
        const end = new Date(row[59]);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          this.logger.warn(`Invalid date in row: ${JSON.stringify(row)}`);
          return;
        }

        const durationMs = end.getTime() - start.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        const dateKey = start.toISOString().split('T')[0];

        if (!sleepData[dateKey]) {
          sleepData[dateKey] = 0;
        }

        sleepData[dateKey] += durationMinutes;
      })
      .on('end', () => {
        console.log('Sleep per day (in minutes):');
        for (const [date, minutes] of Object.entries(sleepData)) {
          console.log(`${date}: ${minutes} min`);
        }
      });
  }
}
