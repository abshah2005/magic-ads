export type CreditAdjustmentHistoryItem = {
  periodStart: Date;
  periodEnd: Date;
  planId: string;
  invoiceId?: string;
  adjustment: number;
  reason: string;
};