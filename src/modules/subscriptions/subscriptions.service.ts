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
import { ApiResponse } from 'src/common/responses/api-response';
import { PlanRepository } from '../plans/plans.repository';
import { UsersRepository } from '../users/users.repository';
import Webhooks from 'stripe';
import { SubscriptionStatus } from './dto/subscription-status.type';
import { BillingHistoryQueryDto } from './dto/billing-history-query.dto';
import {
  addCredits,
  consumeCredits,
  rollbackCredits,
} from 'src/common/utils/credits.util';
import { generateFreeStripeLikeId } from 'src/common/utils/generate-random.util';

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
      if (!existingSubscription) {
        throw new NotFoundException('Subscription not found');
      }

      const existingPlan = await this.plansRepository.findById(
        existingSubscription.planId,
      );

      if (!existingPlan) {
        throw new NotFoundException(
          'no plan associated with subscription found',
        );
      }

      if (
        existingSubscription.status === SubscriptionStatus.ACTIVE &&
        existingPlan &&
        existingPlan.price > 0
      ) {
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

  async getUserCredits(userId: string): Promise<ApiResponse> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data = {
      userId: user._id.toString(),
      creditsAvailable: user.creditsAvailable ?? 0,
      creditsConsumed: user.creditsConsumed ?? 0,
      totalCredits: (user.creditsAvailable ?? 0) + (user.creditsConsumed ?? 0),
    };

    return ApiResponse.success(data, 'User credits fetched successfully', 200);
  }

  async addUserCredits(
    userId: string,
    amount: number,
    reason?: string,
  ): Promise<ApiResponse> {
    const newBalance = await addCredits(
      userId,
      amount,
      this.userRepository,
      reason,
    );
    return ApiResponse.success(
      { creditsAvailable: newBalance },
      `Credits added successfully. Reason: ${reason ?? 'N/A'}`,
      200,
    );
  }

  async consumeUserCredits(
    userId: string,
    amount: number,
    options?: { reason?: string; rollbackOnFail?: boolean },
  ): Promise<ApiResponse> {
    const newBalance = await consumeCredits(
      userId,
      amount,
      this.userRepository,
      options,
    );
    return ApiResponse.success(
      { creditsAvailable: newBalance },
      `Credits consumed successfully. Reason: ${options?.reason ?? 'N/A'}`,
      200,
    );
  }

  async rollbackUserCredits(
    userId: string,
    amount: number,
    reason?: string,
  ): Promise<ApiResponse> {
    const newBalance = await rollbackCredits(
      userId,
      amount,
      this.userRepository,
      reason,
    );
    return ApiResponse.success(
      { creditsAvailable: newBalance },
      `Credits rolled back successfully. Reason: ${reason ?? 'N/A'}`,
      200,
    );
  }

  async getBillingHistory(
    userId: string,
    query: BillingHistoryQueryDto,
  ): Promise<ApiResponse> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const params: Stripe.InvoiceListParams = {
      customer: subscription.stripeCustomerId,
      limit: query.limit,
    };

    if (query.cursor) {
      if (query.direction === 'next') {
        params.starting_after = query.cursor;
      } else {
        params.ending_before = query.cursor;
      }
    }

    const invoices = await this.stripe.invoices.list(params);

    // invoices.data.forEach((invoice) => {
    //   invoice.lines.data.forEach((line) => {
    //     console.log(line.metadata);
    //   });
    // });

    const data = invoices.data.map((invoice) => ({
      id: invoice.id,
      amountPaid: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      description: invoice.lines.data[0]?.description ?? 'No description',
      created: new Date(invoice.created * 1000),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    }));

    const meta = {
      hasMore: invoices.has_more,
      nextCursor:
        invoices.has_more && data.length ? data[data.length - 1].id : null,
      prevCursor: data.length ? data[0].id : null,
    };
    return ApiResponse.success(
      data,
      'Billing history fetched successfully',
      200,
      meta,
    );
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

    const stripeSub = await this.stripe.subscriptions.update(
      currentSubscription.stripeSubscriptionId,
      {
        items: [
          {
            id: subscriptionItemId,
            price: newPlan.stripePriceId,
          },
        ],
        proration_behavior: 'create_prorations',
        metadata: { planId: newPlanId },
      },
    );
    console.log('checking things');

    const item = stripeSub.items.data[0];
    const periodStart = new Date(item.current_period_start * 1000);
    const periodEnd = new Date(item.current_period_end * 1000);

    console.log(
      'checking things',
      item.current_period_end,
      item.current_period_start,
    );

    console.log('reached propration');
    await this.adjustUserCredits(
      userId,
      currentSubscription.id,
      currentSubscription.planId,
      newPlanId,
      periodStart,
      periodEnd,
      undefined,
      'Subscription upgrade/downgrade prorated adjustment',
    );

    const updated = await this.subscriptionRepository.update(
      currentSubscription._id.toString(),
      {
        planId: newPlanId,
        stripePriceId: newPlan.stripePriceId,
        stripeProductId: newPlan.stripeProductId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    );

    return ApiResponse.success(
      updated,
      'Subscription updated successfully',
      200,
    );
  }

  async assignFreePlanToUser(userId: string): Promise<void> {
    const existing = await this.subscriptionRepository.findByUserId(userId);
    if (existing) {
      throw new Error('Susbcription already exists against this user');
    }

    const freePlan = await this.plansRepository.findFreePlan();
    if (!freePlan) throw new Error('Free plan not found');

    await this.subscriptionRepository.create({
      stripeSubscriptionId: generateFreeStripeLikeId('free_sub'),
      stripeCustomerId: generateFreeStripeLikeId('free_cus'),
      userId,
      planId: freePlan._id.toString(),
      stripePriceId: freePlan.stripePriceId,
      stripeProductId: freePlan.stripeProductId,
      status: SubscriptionStatus.TRIALING,
      isActive: true,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await this.userRepository.updateUser(userId, {
      creditsAvailable: freePlan.aiCredits,
    });
  }

  async getUserSubscription(userId: string): Promise<ApiResponse> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const response: SubscriptionResponseDto = {
      id: subscription._id.toString(),
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      isActive: subscription.isActive,
    };

    return ApiResponse.success(
      response,
      'Subscription fetched successfully',
      200,
    );
  }

  async cancelSubscription(
    userId: string,
    reason?: string,
  ): Promise<ApiResponse> {
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
          reason: reason,
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
    subscriptionId: string,
    currentPlanId: string,
    newPlanId: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    invoiceId?: string,
    reason?: string,
  ): Promise<void> {
    console.log('[adjustUserCredits] Called with:', {
      userId,
      subscriptionId,
      currentPlanId,
      newPlanId,
      currentPeriodStart,
      currentPeriodEnd,
      invoiceId,
      reason,
    });

    const user = await this.userRepository.findById(userId);
    const subscription =
      await this.subscriptionRepository.findById(subscriptionId);

    if (!user || !subscription) {
      throw new NotFoundException('User or subscription not found');
    }

    const currentPlan = await this.plansRepository.findById(currentPlanId);
    const newPlan = await this.plansRepository.findById(newPlanId);

    if (!currentPlan || !newPlan) {
      console.error('[adjustUserCredits] Plan not found', {
        currentPlan,
        newPlan,
      });
      throw new NotFoundException('Plan not found');
    }

    const alreadyAdjusted = subscription.creditAdjustmentHistory?.some(
      (entry) =>
        entry.invoiceId === invoiceId ||
        (entry.periodStart.getTime() === currentPeriodStart.getTime() &&
          entry.periodEnd.getTime() === currentPeriodEnd.getTime() &&
          entry.planId === newPlanId),
    );

    if (alreadyAdjusted) {
      return;
    }

    let creditAdjustment = 0;

    if (
      !subscription.creditAdjustmentHistory ||
      subscription.creditAdjustmentHistory.length === 0
    ) {
      creditAdjustment = newPlan.aiCredits;
    } else {
      const today = new Date();
      const remainingDays = Math.ceil(
        (currentPeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      const currentDailyRate = currentPlan.aiCredits / 30;
      const newDailyRate = newPlan.aiCredits / 30;

      const unusedCredits = Math.floor(currentDailyRate * remainingDays);
      const additionalCredits = Math.floor(newDailyRate * remainingDays);

      creditAdjustment = additionalCredits - unusedCredits;
    }

    const finalCredits = Math.max(user.creditsAvailable + creditAdjustment, 0);

    await this.userRepository.updateUser(userId, {
      creditsAvailable: finalCredits,
    });

    subscription.creditAdjustmentHistory.push({
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd,
      planId: newPlanId,
      invoiceId,
      adjustment: creditAdjustment,
      reason: reason ?? 'Subscription adjustment',
    });

    await this.subscriptionRepository.update(subscriptionId, {
      creditAdjustmentHistory: subscription.creditAdjustmentHistory,
    });
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    const subscriptionId = session.subscription?.toString();
    if (!subscriptionId) return;

    const subscription =
      await this.subscriptionRepository.findByStripeSubscriptionId(
        subscriptionId,
      );
    if (!subscription) return;

    if (session.payment_status === 'paid') {
      await this.subscriptionRepository.updateByStripeSubscriptionId(
        subscriptionId,
        {
          status: SubscriptionStatus.ACTIVE,
          isActive: true,
        },
      );

      const plan = await this.plansRepository.findById(subscription.planId);
      const user = await this.userRepository.findById(subscription.userId);
    } else {
      console.log(
        `Checkout session completed but payment incomplete for subscription ${subscriptionId}`,
      );
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      throw new Error('User ID is missing in subscription metadata');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.subscriptionRepository.updateByStripeSubscriptionId(
      subscription.id,
      {
        status: subscription.status as SubscriptionStatus,
      },
    );

    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      //will send mails later for past due
      console.log(`Subscription is past due for user: ${user.email}`);
    } else if (subscription.status === SubscriptionStatus.UNPAID) {
      //will send mails later for unpaid
      console.log(`Subscription is unpaid for user: ${user.email}`);
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    const planId = subscription.metadata?.planId;

    if (!userId || !planId) return;

    const existing = await this.subscriptionRepository.findByUserId(userId);

    if (existing) {
      await this.subscriptionRepository.update(existing._id.toString(), {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        planId,
        stripePriceId: subscription.items.data[0].price.id,
        stripeProductId: subscription.items.data[0].price.product as string,
        status: subscription.status as SubscriptionStatus,
        isActive: false,
      });
    } else {
      await this.subscriptionRepository.create({
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        userId,
        planId,
        stripePriceId: subscription.items.data[0].price.id,
        stripeProductId: subscription.items.data[0].price.product as string,
        status: subscription.status as SubscriptionStatus,
        isActive: false,
      });
    }
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
    const subscriptionId =
      invoice.parent?.subscription_details?.subscription.toString();
    if (!subscriptionId) {
      throw new NotFoundException('Subscription not found');
    }

    const subscription =
      await this.subscriptionRepository.findByStripeSubscriptionId(
        subscriptionId,
      );
    if (!subscription) return;

    const user = await this.userRepository.findById(subscription.userId);
    const plan = await this.plansRepository.findById(subscription.planId);
    if (!user || !plan) return;

    // Only add full plan credits **once per invoice**
    await this.adjustUserCredits(
      user.id,
      subscription._id.toString(),
      subscription.planId,
      subscription.planId,
      new Date(invoice.period_start * 1000),
      new Date(invoice.period_end * 1000),
      invoice.id,
      'Monthly subscription credit addition',
    );

    await this.subscriptionRepository.updateByStripeSubscriptionId(
      subscriptionId,
      {
        status: SubscriptionStatus.ACTIVE,
        isActive: true,
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
      },
    );
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId =
      invoice.parent?.subscription_details?.subscription.toString();

    if (!subscriptionId) {
      throw new NotFoundException('Subscription not found');
    }

    const subscription =
      await this.subscriptionRepository.findByStripeSubscriptionId(
        subscriptionId,
      );

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const attemptCount = invoice.attempt_count ?? 0;
    const nextAttempt = invoice.next_payment_attempt;

    let newStatus: SubscriptionStatus = SubscriptionStatus.PAST_DUE;
    let gracePeriodEnd: Date | null = null;

    if (!nextAttempt && attemptCount > 0) {
      newStatus = SubscriptionStatus.UNPAID;
      // Set grace period (e.g., 7 days from now)
      gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    //  Persist status (idempotent)
    await this.subscriptionRepository.updateByStripeSubscriptionId(
      subscriptionId,
      {
        status: newStatus,
        isActive: false,
        gracePeriodEnd, // <-- add this
      },
    );

    //  Notify user (no side effects)
    const user = await this.userRepository.findById(subscription.userId);
    if (user) {
      console.log(
        `⚠️ Payment failed for user ${user.email}. Status: ${newStatus}`,
      );
      // TODO: send email / push / in-app notification
    }

    //  If UNPAID → Stripe will auto-cancel (prepare cleanup)
    if (newStatus === SubscriptionStatus.UNPAID) {
      console.log(
        `🚫 Subscription ${subscriptionId} is unpaid and may be canceled by Stripe`,
      );
    }
  }
}
