export class SubscriptionResponseDto {
  id: string;
  // stripeSubscriptionId: string;
  // stripeCustomerId: string;
  userId: string;
  planId: string;
  // stripePriceId: string;
  // stripeProductId: string;
  status: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  isActive: boolean;
}

export class CheckoutSessionResponseDto {
  id: string;
  url: string | null;
  status: string | null;
  customerId?: string;
  subscriptionId?: string;
}