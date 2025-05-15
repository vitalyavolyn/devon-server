import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TelegramSurveyStateDocument = HydratedDocument<TelegramSurveyState>;

@Schema()
export class TelegramSurveyState {
  @Prop()
  key: string;

  @Prop()
  lastRun: Date;

  @Prop()
  reminderSent: boolean;
}

export const TelegramSurveyStateSchema =
  SchemaFactory.createForClass(TelegramSurveyState);
