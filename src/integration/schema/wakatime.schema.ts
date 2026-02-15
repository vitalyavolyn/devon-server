import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WakatimeDocument = HydratedDocument<Wakatime>;

@Schema()
export class Wakatime {
  @Prop({ index: true })
  date: Date;

  @Prop()
  project: string;

  @Prop()
  duration: number;
}

export const WakatimeSchema = SchemaFactory.createForClass(Wakatime);
