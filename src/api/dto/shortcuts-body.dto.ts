import { IsDefined, IsNumberString, Matches } from 'class-validator';

export class ShortcutsBodyDto {
  @IsNumberString()
  @IsDefined()
  /** Yesterday's steps */
  steps: string;

  @Matches(/^\d\d?:\d{2}$/)
  @IsDefined()
  /** Today's sleep HH:mm */
  sleep: string;
}
