import { Controller, Get, Query } from '@nestjs/common';
import { ApiService } from './api.service';
import { GetRangeParamsDto } from './dto/get-range-params.dto';

@Controller()
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get()
  getHello(): string {
    return this.apiService.getHello();
  }

  @Get('getRange')
  getRange(@Query() params: GetRangeParamsDto) {
    return this.apiService.getRange(params);
  }

  @Get('today')
  getToday() {
    return this.apiService.getToday();
  }
}
