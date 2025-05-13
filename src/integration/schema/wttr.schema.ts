import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WttrDocument = HydratedDocument<Wttr>;

@Schema({
  timeseries: {
    timeField: 'date',
  },
})
export class Wttr {
  @Prop()
  date: Date;

  @Prop()
  maxTempC: string;

  @Prop()
  minTempC: string;

  @Prop()
  areaName: string;
}

export const WttrSchema = SchemaFactory.createForClass(Wttr);
