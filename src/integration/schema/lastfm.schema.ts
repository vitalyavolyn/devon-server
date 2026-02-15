import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LastfmDocument = HydratedDocument<Lastfm>;

@Schema()
export class Lastfm {
  @Prop({ index: true })
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
