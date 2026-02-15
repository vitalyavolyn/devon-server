import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WttrDocument = HydratedDocument<Wttr>;

@Schema()
export class Wttr {
  @Prop({ index: true })
  date: Date;

  @Prop()
  maxTempC: string;

  @Prop()
  minTempC: string;

  @Prop()
  areaName: string;

  @Prop()
  areaCountry: string;

  @Prop()
  areaLatitude: number;

  @Prop()
  areaLongitude: number;

  @Prop()
  current: boolean;
}

export const WttrSchema = SchemaFactory.createForClass(Wttr);
