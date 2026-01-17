import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
} from './schemas/subscriptions.schema';
import { SubscriptionStatus } from './dto/subscription-status.type';

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
      .exec();
  }

  async findByUserId(userId: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({ userId, isActive: true })
      .exec();
  }

  async findById(id: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({ _id:id })
      .exec();
  }

  async findAllByUserId(userId: string): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel
      .find({ userId })
      .exec();
  }

  async update(
    id: string,
    updateData: Partial<Subscription>,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async updateByStripeSubscriptionId(
    stripeSubscriptionId: string,
    updateData: Partial<Subscription>,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOneAndUpdate({ stripeSubscriptionId }, updateData, { new: true })
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
      .exec();
  }

  async findAllActive(): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel
      .find({ isActive: true, status: SubscriptionStatus.ACTIVE })
      .exec();
  }

  async delete(id: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel.findByIdAndDelete(id).exec();
  }
}
