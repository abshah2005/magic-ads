import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEmail,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsNotEmpty({ message: 'Plan ID is required' })
  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsBoolean()
  trialFromPlan?: boolean;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  promotionCode?: string;
}