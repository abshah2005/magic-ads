import Stripe from "stripe";

export type BillingHistoryItem = {
  id: string;
  amountPaid: number;
  currency: string;
  status: Stripe.Invoice.Status | null;
  description: string;
  created: Date;
  dueDate: Date | null;
};

export type BillingHistory = BillingHistoryItem[];