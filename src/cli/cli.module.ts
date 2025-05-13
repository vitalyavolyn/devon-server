import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InitCommand } from './init.command';
import { IntegrationModule } from '../integration/integration.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportCommand } from './import.command';
import { SamsungHealthImporter } from './importers/samsung-health.importer';

@Module({
  imports: [
    ConfigModule.forRoot(),
    IntegrationModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DB_URI'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [InitCommand, ImportCommand, SamsungHealthImporter],
})
export class CliModule {}
