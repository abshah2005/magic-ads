import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from './schemas/subscriptions.schema';

@Injectable()
export class SubscriptionRepository {
  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async create(
    subscriptionData: Partial<Subscription>,
  ): Promise<SubscriptionDocument> {
    const subscription = new this.subscriptionModel(subscriptionData);
    return subscription.save();
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({ stripeSubscriptionId })
      // .populate('userId')
      // .populate('planId')
      .exec();
  }

  async findByUserId(userId: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({ userId, isActive: true })
      // .populate('userId')
      // .populate('planId')
      .exec();
  }

  async findAllByUserId(userId: string): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel
      .find({ userId })
      // .populate('userId')
      // .populate('planId')
      .exec();
  }

  async update(
    id: string,
    updateData: Partial<Subscription>,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      // .populate('userId')
      // .populate('planId')
      .exec();
  }

  async updateByStripeSubscriptionId(
    stripeSubscriptionId: string,
    updateData: Partial<Subscription>,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOneAndUpdate({ stripeSubscriptionId }, updateData, { new: true })
      // .populate('userId')
      // .populate('planId')
      .exec();
  }

  async cancel(id: string): Promise<SubscriptionDocument | null> {
    const subscription = await this.subscriptionModel.findById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.subscriptionModel
      .findByIdAndUpdate(
        id,
        {
          status: SubscriptionStatus.CANCELED,
          isActive: false,
          canceledAt: new Date(),
        },
        { new: true },
      )
      // .populate('userId')
      // .populate('planId')
      .exec();
  }

  async findAllActive(): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel
      .find({ isActive: true, status: SubscriptionStatus.ACTIVE })
      // .populate('userId')
      // .populate('planId')
      .exec();
  }

  async delete(id: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel.findByIdAndDelete(id).exec();
  }
}