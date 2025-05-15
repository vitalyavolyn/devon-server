import { Module } from '@nestjs/common';
import { IntegrationModule } from '../integration/integration.module';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { BotModule } from 'src/bot/bot.module';

@Module({
  imports: [IntegrationModule, BotModule],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
