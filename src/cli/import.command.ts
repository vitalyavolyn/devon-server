import { Command, CommandRunner } from 'nest-commander';
import { Importable } from '../types';
import { SamsungHealthImporter } from './importers/samsung-health.importer';

@Command({ name: 'import', description: 'Import historical data' })
export class ImportCommand extends CommandRunner {
  public constructor(
    private readonly samsungHealthImporter: SamsungHealthImporter,
  ) {
    super();
  }

  private getService(serviceName: string): Importable | null {
    switch (serviceName) {
      case 'samsung':
        return this.samsungHealthImporter;
      default:
        return null;
    }
  }

  public async run(passedParams: string[]): Promise<void> {
    const serviceName = passedParams[0];

    if (!serviceName) {
      console.error('Error: no service name provided');
      return;
    }

    const importer = this.getService(serviceName);

    if (!importer) {
      console.error('No importer named', serviceName);
      return;
    }

    try {
      await importer.import(passedParams.slice(1));
    } catch (e) {
      console.error('Command resulted in error:');
      console.error(e);
    }
  }
}
