import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WakatimeDocument = HydratedDocument<Wakatime>;

@Schema({
  timeseries: {
    timeField: 'date',
  },
})
export class Wakatime {
  @Prop()
  date: Date;

  @Prop()
  project: string;

  @Prop()
  duration: number;
}

export const WakatimeSchema = SchemaFactory.createForClass(Wakatime);
