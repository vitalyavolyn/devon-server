import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TelegramAnswerDocument = HydratedDocument<TelegramAnswer>;

@Schema({
  timeseries: {
    timeField: 'date',
    metaField: 'key',
  },
})
export class TelegramAnswer {
  @Prop()
  key: string;

  @Prop()
  answer: string;

  @Prop()
  numberValue?: number;

  @Prop({ type: Date, default: Date.now })
  date: Date;
}

export const TelegramAnswerSchema =
  SchemaFactory.createForClass(TelegramAnswer);
