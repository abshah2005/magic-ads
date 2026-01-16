import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionController } from './subscriptions.controller';
import { SubscriptionService } from './subscriptions.service';
import { SubscriptionRepository } from './subscriptions.repository';
import { Subscription, SubscriptionSchema } from './schemas/subscriptions.schema';
import { PlansModule } from '../plans/plans.module';
import { UsersModule } from '../users/users.module';
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    PlansModule,
    UsersModule
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionRepository],
  exports: [SubscriptionService, MongooseModule],
})
export class SubscriptionModule {}