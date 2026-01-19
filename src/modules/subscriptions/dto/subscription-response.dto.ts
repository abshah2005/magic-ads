export class SubscriptionResponseDto {
  id: string;
  userId: string;
  planId: string;
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