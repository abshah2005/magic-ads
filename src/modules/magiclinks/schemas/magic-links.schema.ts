import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MagicLinkDocument = MagicLink & Document;

@Schema({ timestamps: true })
export class MagicLink {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;
}

export const MagicLinkSchema = SchemaFactory.createForClass(MagicLink);
MagicLinkSchema.set('versionKey', false);