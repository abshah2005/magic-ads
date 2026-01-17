import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { SubscriptionStatus } from '../dto/subscription-status.type';
import { CreditAdjustmentHistoryItem } from '../dto/credit-adjustment-history.dto';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true })
  stripeSubscriptionId: string;

  @Prop({ required: true })
  stripeCustomerId: string;

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  userId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Plan', required: true })
  planId: string;

  @Prop({ required: true })
  stripePriceId: string;

  @Prop({ required: true })
  stripeProductId: string;

  @Prop({ required: true, enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @Prop({ type: Date, default: null })
  currentPeriodStart?: Date;

  @Prop({ type: Date, default: null })
  currentPeriodEnd?: Date;

  @Prop({ type: Boolean, default: null })
  cancelAtPeriodEnd?: boolean;

  @Prop({ type: Date, default: null })
  canceledAt?: Date;

  @Prop({ type: Date, default: null })
  trialStart?: Date;

  @Prop({ type: Date, default: null })
  trialEnd?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop({ type: [Object], default: [] })
  creditAdjustmentHistory: CreditAdjustmentHistoryItem[];

  @Prop()
  updatedAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true });
SubscriptionSchema.index({ stripeCustomerId: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.set('versionKey', false);
