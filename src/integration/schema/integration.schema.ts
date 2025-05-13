import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IntegrationDocument = HydratedDocument<Integration>;

@Schema()
export class Integration {
  @Prop()
  integration: string;

  @Prop()
  lastSync: Date;

  @Prop({ type: String, enum: ['ok', 'error'] })
  status: string;
}

export const IntegrationSchema = SchemaFactory.createForClass(Integration);
