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
import { BillingHistory } from './dto/billing-history.type';
import { SubscriptionStatus } from './dto/subscription-status.type';
import { PaginationUtil } from 'src/common/utils/pagination.util';
import { BillingHistoryQueryDto } from './dto/billing-history-query.dto';
import {
  addCredits,
  consumeCredits,
  rollbackCredits,
} from 'src/common/utils/credits.util';

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

  async getUserSubscription(userId: string): Promise<ApiResponse> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const response: SubscriptionResponseDto = {
      id: subscription._id.toString(),
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeCustomerId: subscription.stripeCustomerId,
      userId: subscription.userId,
      planId: subscription.planId,
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
      console.log(`Subscription is past due for user: ${user.email}`);
    } else if (subscription.status === SubscriptionStatus.UNPAID) {
      console.log(`Subscription is unpaid for user: ${user.email}`);
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    const planId = subscription.metadata?.planId;

    if (!userId || !planId) return;

    await this.subscriptionRepository.create({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      userId,
      planId,
      stripePriceId: subscription.items.data[0].price.id,
      stripeProductId: subscription.items.data[0].price.product as string,
      status: subscription.status as SubscriptionStatus, // incomplete
      isActive: false, // 🔴 IMPORTANT
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
    const subscriptionId =
      invoice.parent?.subscription_details?.subscription.toString();

    if (!subscriptionId) return;

    const subscription =
      await this.subscriptionRepository.findByStripeSubscriptionId(
        subscriptionId,
      );

    if (!subscription) return;

    const plan = await this.plansRepository.findById(subscription.planId);
    const user = await this.userRepository.findById(subscription.userId);

    if (!plan || !user) return;

    await this.userRepository.updateUser(user.id, {
      creditsAvailable: user.creditsAvailable + plan.aiCredits,
    });

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

    /**
     * Stripe rules:
     * - incomplete  → first payment failed
     * - past_due    → retrying
     * - unpaid      → retries exhausted (final)
     */
    if (!nextAttempt && attemptCount > 0) {
      newStatus = SubscriptionStatus.UNPAID;
    }

    // 4️⃣ Persist status (idempotent)
    await this.subscriptionRepository.updateByStripeSubscriptionId(
      subscriptionId,
      {
        status: newStatus,
        isActive: false,
      },
    );

    // 5️⃣ Notify user (no side effects)
    const user = await this.userRepository.findById(subscription.userId);
    if (user) {
      console.log(
        `⚠️ Payment failed for user ${user.email}. Status: ${newStatus}`,
      );
      // TODO: send email / push / in-app notification
    }

    // 6️⃣ If UNPAID → Stripe will auto-cancel (prepare cleanup)
    if (newStatus === SubscriptionStatus.UNPAID) {
      console.log(
        `🚫 Subscription ${subscriptionId} is unpaid and may be canceled by Stripe`,
      );
    }
  }
}
