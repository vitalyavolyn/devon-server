import { Controller, Get, Query } from '@nestjs/common';
import { ApiService } from './api.service';
import { GetRangeParamsDto } from './dto/get-range-params.dto';

@Controller()
export class ApiController {
  public constructor(private readonly apiService: ApiService) {}

  @Get()
  public getHello(): string {
    return this.apiService.getHello();
  }

  @Get('getRange')
  public getRange(@Query() params: GetRangeParamsDto) {
    return this.apiService.getRange(params);
  }

  @Get('today')
  public getToday() {
    return this.apiService.getToday();
  }
}
