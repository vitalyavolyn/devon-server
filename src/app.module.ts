import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationModule } from './integration/integration.module';
import { ApiModule } from './api/api.module';
import { BotModule } from './bot/bot.module';
import { TelegrafModule } from 'nestjs-telegraf';
import { createGuardMiddleware } from './bot/guard.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DB_URI'),
      }),
      inject: [ConfigService],
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_TOKEN')!,
        middlewares: [
          createGuardMiddleware(configService.get<string>('TELEGRAM_CHAT_ID')!),
        ],
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    IntegrationModule,
    ApiModule,
    BotModule,
  ],
})
export class AppModule {}
