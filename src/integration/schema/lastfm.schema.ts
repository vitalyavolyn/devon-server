import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LastfmDocument = HydratedDocument<Lastfm>;

@Schema({
  timeseries: {
    timeField: 'scrobbledAt',
  },
})
export class Lastfm {
  @Prop()
  scrobbledAt: Date;

  @Prop()
  artist: string;

  @Prop()
  title: string;

  @Prop()
  url: string;

  @Prop()
  image: string;
}

export const LastfmSchema = SchemaFactory.createForClass(Lastfm);
