import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LetterboxdDocument = HydratedDocument<Letterboxd>;

@Schema({
  timeseries: {
    timeField: 'watchedDate',
  },
})
export class Letterboxd {
  @Prop()
  watchedDate: Date;

  @Prop()
  movieName: string;

  @Prop()
  releasedYear: string;

  @Prop()
  letterboxdUri: string;

  @Prop({ type: Number })
  rating: number | null;

  @Prop()
  rewatch: boolean;
}

export const LetterboxdSchema = SchemaFactory.createForClass(Letterboxd);
