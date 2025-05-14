import { Module } from '@nestjs/common';
import { IntegrationModule } from '../integration/integration.module';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';

@Module({
  imports: [IntegrationModule],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
