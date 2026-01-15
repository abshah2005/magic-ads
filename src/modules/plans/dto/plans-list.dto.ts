export class PlanListDto {
  page: number;
  limit: number;
  total: number;
  data: PlanItemDto[];
}

export class PlanItemDto {
  _id: string;
  name: string;
  type: string;
  description: string;
  price: number;
  interval: string;
  stripePriceId: string;
  stripeProductId: string;
  aiCredits: number;
  activeAdCampaigns: number;
  assetStorage: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}