import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PlanDocument = Plan & Document;

export enum PlanInterval {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

export enum PlanType {
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, enum: Object.values(PlanType) })
  type: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, enum: Object.values(PlanInterval) })
  interval: string;

  @Prop({ required: true })
  stripePriceId: string;

  @Prop({ required: true })
  stripeProductId: string;

  @Prop({ required: true })
  aiCredits: number;

  @Prop({ required: true })
  activeAdCampaigns: number;

  @Prop({ required: true })
  assetStorage: string;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: false })
  isPopular: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ default: new Date() })
  createdAt: Date;

  @Prop({ default: new Date() })
  updatedAt: Date;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

PlanSchema.index({ type: 1, interval: 1 }, { unique: true });
PlanSchema.index({ isActive: 1 });
PlanSchema.index({ sortOrder: 1 });
PlanSchema.set('versionKey', false);