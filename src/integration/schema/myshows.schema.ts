import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MyshowsDocument = HydratedDocument<Myshows>;

@Schema({
  timeseries: {
    timeField: 'watchedDate',
  },
})
export class Myshows {
  @Prop()
  watchedDate: Date;

  @Prop()
  showName: string;

  @Prop()
  showId: number;

  @Prop()
  episodeName: string;

  @Prop()
  episodeCode: string;

  @Prop()
  episodeId: number;
}

export const MyshowsSchema = SchemaFactory.createForClass(Myshows);
