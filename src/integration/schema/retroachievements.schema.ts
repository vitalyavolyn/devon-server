import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RetroachievementsDocument = HydratedDocument<Retroachievements>;

@Schema({
  timeseries: {
    timeField: 'date',
  },
})
export class Retroachievements {
  @Prop()
  date: Date;

  @Prop()
  title: string;

  @Prop()
  game: string;

  @Prop()
  description: string;

  @Prop()
  gameUrl: string;

  @Prop()
  image: string;

  @Prop()
  isHardcore: boolean;

  @Prop()
  points: number;
}

export const RetroachievementsSchema =
  SchemaFactory.createForClass(Retroachievements);
