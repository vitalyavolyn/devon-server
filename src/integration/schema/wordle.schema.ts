import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WordleDocument = HydratedDocument<Wordle>;

@Schema()
export class Wordle {
  @Prop({ index: true })
  date: Date;

  @Prop()
  solution: string;

  @Prop()
  status: string;

  @Prop()
  hardMode: boolean;

  @Prop({ type: [String] })
  boardState: string[];

  @Prop()
  day: number;
}

export const WordleSchema = SchemaFactory.createForClass(Wordle);
