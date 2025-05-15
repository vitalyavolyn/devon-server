import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class GetRangeParamsDto {
  @IsDateString()
  @IsOptional()
  startDate: Date;

  @IsDateString()
  @IsOptional()
  endDate: Date;

  @IsNumber()
  @IsOptional()
  limit: number;
}
