import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { PlanInterval, PlanType } from '../schemas/plans.schema';

export class CreatePlanDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Type is required' })
  @IsEnum(PlanType)
  type: string;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  description: string;

  @IsNotEmpty({ message: 'Price is required' })
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty({ message: 'Interval is required' })
  @IsEnum(PlanInterval)
  interval: string;

  @IsNotEmpty({ message: 'Stripe Price ID is required' })
  @IsString()
  stripePriceId: string;

  @IsNotEmpty({ message: 'Stripe Product ID is required' })
  @IsString()
  stripeProductId: string;

  @IsNotEmpty({ message: 'AI Credits is required' })
  @IsNumber()
  @Min(0)
  aiCredits: number;

  @IsNotEmpty({ message: 'Active Ad Campaigns is required' })
  @IsNumber()
  @Min(0)
  activeAdCampaigns: number;

  @IsNotEmpty({ message: 'Asset Storage is required' })
  @IsString()
  assetStorage: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}