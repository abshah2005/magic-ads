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
import { BillingHistory } from './dto/billing-history.type';

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
      const plan = await this.plansRepository.findById(
        createSubscriptionDto.planId,
      );

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      const existingSubscription =
        await this.subscriptionRepository.findByUserId(userId);

      if (existingSubscription) {
        throw new BadRequestException(
          'User already has an active subscription',
        );
      }

      const userFound = await this.userRepository.findById(userId);

      const userEmail = userFound?.email;
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

  
    async getBillingHistory(userId: string): Promise<ApiResponse> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      throw new NotFoundException('No active subscription found for the user');
    }

    try {
      const invoices = await this.stripe.invoices.list({
        customer: subscription.stripeCustomerId,
        limit: 10,
      });

      const billingHistory: BillingHistory = invoices.data.map((invoice) => ({
        id: invoice.id,
        amountPaid: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        description: invoice.lines.data[0]?.description || 'No description',
        created: new Date(invoice.created * 1000), 
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      }));

      return ApiResponse.success(
        billingHistory,
        'Billing history fetched successfully',
        200,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch billing history: ${error.message}`,
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
          await this.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription,
          );
          break;
        // case 'customer.subscription.updated':
        //   await this.handleSubscriptionUpdated(
        //     event.data.object as Stripe.Subscription,
        //   );
        //   break;

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
  ) {}

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
        proration_behavior: 'create_prorations', // Enable proration
        metadata: {
          planId: newPlanId,
        },
      },
    );
    const item = updatedSubscription.items.data[0];

    if (!item?.current_period_start || !item?.current_period_end) {
      throw new Error('Subscription period not available yet');
    }

    // Adjust user credits based on the plan change and proration
    await this.adjustUserCredits(
      userId,
      currentSubscription.planId,
      newPlanId,
      new Date(item.current_period_end * 1000),
    );

    // Update the subscription in the database
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
      'Subscription updated successfully with proration applied',
      200,
    );
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    const newPlanId = subscription.metadata?.planId;

    if (!userId || !newPlanId) {
      throw new Error('User ID or Plan ID is missing in subscription metadata');
    }

    const currentSubscription =
      await this.subscriptionRepository.findByStripeSubscriptionId(
        subscription.id,
      );

    if (!currentSubscription) {
      throw new NotFoundException('Subscription not found');
    }

    const item = subscription.items.data[0];

    await this.adjustUserCredits(
      userId,
      currentSubscription.planId,
      newPlanId,
      new Date(item.current_period_end * 1000),
    );

    // Update subscription in the database
    await this.subscriptionRepository.updateByStripeSubscriptionId(
      subscription.id,
      {
        planId: newPlanId,
        stripePriceId: item.price.id,
        stripeProductId: item.price.product as string,
        status: subscription.status as SubscriptionStatus,
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
      },
    );
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    const planId = subscription.metadata?.planId;

    const item = subscription.items.data[0];

    if (!item?.current_period_start || !item?.current_period_end) {
      throw new Error('Subscription period not available yet');
    }

    if (!userId || !planId) {
      throw new Error('User ID or Plan ID is missing in subscription metadata');
    }

    const plan = await this.plansRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const user = await this.userRepository.findById(userId);
    if (!user?._id) {
      throw new NotFoundException('User not found');
    }

    // Add credits to the user
    await this.userRepository.updateUser(userId, {
      creditsAvailable: user.creditsAvailable + plan.aiCredits,
    });

    // Save subscription in the database
    await this.subscriptionRepository.create({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      userId: userId,
      planId,
      stripePriceId: subscription.items.data[0].price.id,
      stripeProductId: subscription.items.data[0].price.product as string,
      status: subscription.status as SubscriptionStatus,
      currentPeriodStart: new Date(item.current_period_start * 1000),
      currentPeriodEnd: new Date(item.current_period_end * 1000),
      isActive: true,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      throw new Error('User ID is missing in subscription metadata');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Deduct all remaining credits
    await this.userRepository.updateUser(userId, {
      creditsAvailable: 0,
    });

    // Update subscription status in the database
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

  private async adjustUserCredits(
    userId: string,
    currentPlanId: string,
    newPlanId: string,
    currentPeriodEnd: Date,
  ): Promise<void> {
    const currentPlan = await this.plansRepository.findById(currentPlanId);
    const newPlan = await this.plansRepository.findById(newPlanId);

    if (!currentPlan || !newPlan) {
      throw new NotFoundException('Plan details not found');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentDailyRate = currentPlan.aiCredits / 30;
    const newDailyRate = newPlan.aiCredits / 30;

    const today = new Date();
    const remainingDays = Math.ceil(
      (currentPeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (remainingDays < 0) {
      throw new BadRequestException('Billing cycle has already ended');
    }

    const unusedCredits = Math.floor(currentDailyRate * remainingDays);

    const additionalCredits = Math.floor(newDailyRate * remainingDays);

    const creditAdjustment = additionalCredits - unusedCredits;

    const finalCredits = user.creditsAvailable + creditAdjustment;

    console.log('Current Plan Credits:', currentPlan.aiCredits);
    console.log('New Plan Credits:', newPlan.aiCredits);
    console.log('Current Daily Rate:', currentDailyRate);
    console.log('New Daily Rate:', newDailyRate);
    console.log('Remaining Days:', remainingDays);
    console.log('Unused Credits:', unusedCredits);
    console.log('Additional Credits:', additionalCredits);
    console.log('Net Credit Adjustment:', creditAdjustment);
    console.log('User Current Credits (Before Update):', user.creditsAvailable);
    console.log('User Final Credits (After Update):', finalCredits);

    await this.userRepository.updateUser(userId, {
      creditsAvailable: finalCredits,
    });
  }
}
