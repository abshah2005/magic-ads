import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { SubscriptionRepository } from './subscriptions.repository';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import {
  SubscriptionResponseDto,
  CheckoutSessionResponseDto,
} from './dto/subscription-response.dto';
import { SubscriptionStatus } from './schemas/subscriptions.schema';
import { ApiResponse } from 'src/common/responses/api-response';
import { PlanRepository } from '../plans/plans.repository';
import { UsersRepository } from '../users/users.repository';
import Webhooks from 'stripe';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private subscriptionRepository: SubscriptionRepository,
    private plansRepository: PlanRepository,
    private userRepository: UsersRepository,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-12-15.clover',
    });
  }

  async createCheckoutSession(
    userId: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<ApiResponse> {
    try {
      // Get plan details
      const plan = await this.plansRepository.findById(
        createSubscriptionDto.planId,
      );

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // Check if user already has active subscription
      const existingSubscription =
        await this.subscriptionRepository.findByUserId(userId);

      if (existingSubscription) {
        throw new BadRequestException(
          'User already has an active subscription',
        );
      }

      // Note: You need to fetch actual user email from your user service
      const userFound = await this.userRepository.findById(userId);

      const userEmail = userFound?.email; // TODO: Replace with actual user email fetch

      // Create or retrieve Stripe customer
      let customerId: string;
      const customers = await this.stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await this.stripe.customers.create({
          email: userEmail,
          metadata: {
            userId,
          },
        });
        customerId = customer.id;
      }

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/subscription/cancel`,
        metadata: {
          userId,
          planId: createSubscriptionDto.planId,
        },
        subscription_data: {
          metadata: {
            userId,
            planId: createSubscriptionDto.planId,
          },
        },
      });

      const response: CheckoutSessionResponseDto = {
        id: session.id,
        url: session.url,
        status: session.status,
        customerId: session.customer as string,
        subscriptionId: session.subscription as string,
      };

      return ApiResponse.success(
        response,
        'Checkout session created successfully',
        201,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create checkout session: ${error.message}`,
      );
    }
  }

  async handleWebhook(
    payload: Buffer,
    signature: string,
  ): Promise<ApiResponse> {
    try {
      const webhookSecret = this.configService.get<string>(
        'STRIPE_WEBHOOK_SECRET',
      );
      console.log(payload);
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }

      const event = Webhooks.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(
            event.data.object as Stripe.Invoice,
          );
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
          );
          break;
      }

      return ApiResponse.success(null, 'Webhook processed successfully', 200);
    } catch (error) {
      throw new InternalServerErrorException(`Webhook error: ${error.message}`);
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    if (!session.subscription || typeof session.subscription !== 'string') {
      throw new Error('No subscription found in session');
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription,
    );

    const latestInvoice =
      typeof subscription.latest_invoice === 'string'
        ? { id: subscription.latest_invoice }
        : subscription.latest_invoice || {};

    const item = subscription.items.data[0];

    if (!item?.current_period_start || !item?.current_period_end) {
      throw new Error('Subscription period not available yet');
    }

    const foundUser = await this.userRepository.findById(
      subscription.metadata?.userId ?? session.metadata?.userId,
    );

    await this.subscriptionRepository.create({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id,
      userId: foundUser?.id,
      planId: session.metadata?.planId,
      stripePriceId: subscription.items.data[0].price.id,
      stripeProductId:
        typeof subscription.items.data[0].price.product === 'string'
          ? subscription.items.data[0].price.product
          : subscription.items.data[0].price.product.id,
      status: subscription.status as SubscriptionStatus,
      currentPeriodStart: new Date(item.current_period_start * 1000),
      currentPeriodEnd: new Date(item.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : undefined,
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : undefined,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined,
      latestInvoice,
      isActive: true,
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const latestInvoice =
      typeof subscription.latest_invoice === 'string'
        ? { id: subscription.latest_invoice }
        : subscription.latest_invoice || {};

    const item = subscription.items.data[0];

    if (!item?.current_period_start || !item?.current_period_end) {
      throw new Error('Subscription period not available yet');
    }

    await this.subscriptionRepository.updateByStripeSubscriptionId(
      subscription.id,
      {
        status: subscription.status as SubscriptionStatus,
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : undefined,
        trialStart: subscription.trial_start
          ? new Date(subscription.trial_start * 1000)
          : undefined,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : undefined,
        latestInvoice,
        isActive: subscription.status === SubscriptionStatus.ACTIVE,
      },
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.subscriptionRepository.updateByStripeSubscriptionId(
      subscription.id,
      {
        status: SubscriptionStatus.CANCELED,
        isActive: false,
        canceledAt: new Date(),
      },
    );
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    // Update user credits or perform other actions
    console.log('Payment succeeded for invoice:', invoice.id);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // Handle failed payment
    console.log('Payment failed for invoice:', invoice.id);
  }

  

  async getUserSubscription(userId: string): Promise<ApiResponse> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const response: SubscriptionResponseDto = {
      id: subscription._id.toString(),
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeCustomerId: subscription.stripeCustomerId,
      userId: (subscription.userId as any)._id.toString(),
      planId: (subscription.planId as any)._id.toString(),
      stripePriceId: subscription.stripePriceId,
      stripeProductId: subscription.stripeProductId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      isActive: subscription.isActive,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };

    return ApiResponse.success(
      response,
      'Subscription fetched successfully',
      200,
    );
  }

  async cancelSubscription(userId: string): Promise<ApiResponse> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (subscription.cancelAtPeriodEnd) {
      throw new BadRequestException(
        'Subscription is already set to cancel at the end of the billing period',
      );
    }

    if (subscription.status === SubscriptionStatus.CANCELED) {
      throw new BadRequestException('Subscription is already canceled');
    }

    try {
      await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        },
      );

      const updated = await this.subscriptionRepository.update(
        subscription._id.toString(),
        {
          cancelAtPeriodEnd: true,
        },
      );

      return ApiResponse.success(
        updated,
        'Subscription will be canceled at the end of the billing period',
        200,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to cancel subscription: ${error.message}`,
      );
    }
  }

  async updateSubscription(
    userId: string,
    newPlanId: string,
  ): Promise<ApiResponse> {
    const currentSubscription =
      await this.subscriptionRepository.findByUserId(userId);

    if (!currentSubscription) {
      throw new NotFoundException('No active subscription found');
    }

    const newPlan = await this.plansRepository.findById(newPlanId);

    if (!newPlan) {
      throw new NotFoundException('New plan not found');
    }

  
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      currentSubscription.stripeSubscriptionId,
    );
    const subscriptionItemId = stripeSubscription.items.data[0].id;

    const updatedSubscription = await this.stripe.subscriptions.update(
      currentSubscription.stripeSubscriptionId,
      {
        items: [
          {
            id: subscriptionItemId,
            price: newPlan.stripePriceId,
          },
        ],
        proration_behavior: 'create_prorations',
        metadata: {
          planId: newPlanId,
        },
      },
    );
    const item = updatedSubscription.items.data[0];

    if (!item?.current_period_start || !item?.current_period_end) {
      throw new Error('Subscription period not available yet');
    }

    const updated = await this.subscriptionRepository.update(
      currentSubscription._id.toString(),
      {
        planId: newPlanId,
        stripePriceId: newPlan.stripePriceId,
        stripeProductId: newPlan.stripeProductId,
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
      },
    );

    return ApiResponse.success(
      updated,
      'Subscription updated successfully',
      200,
    );
  }
}
