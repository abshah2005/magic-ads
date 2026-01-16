import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Put,
} from '@nestjs/common';
import { SubscriptionService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { Public } from 'src/common/decorators/public.decorator';
import { User } from 'src/common/decorators/user.decorator';
import type { Request } from 'express';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async createCheckoutSession(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @User() user,
  ): Promise<ApiResponse> {
    const userId = user._id;
    if (!userId) {
      throw new BadRequestException('User not found');
    }

    return this.subscriptionService.createCheckoutSession(
      userId.toString(),
      createSubscriptionDto,
    );
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<ApiResponse> {
    const rawBody = req.body;
    console.log(typeof rawBody);
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!rawBody || !(rawBody instanceof Buffer)) {
      throw new BadRequestException('Invalid raw body format');
    }

    return this.subscriptionService.handleWebhook(rawBody, signature);
  }

  @Get('me')
  async getUserSubscription(@User() user): Promise<ApiResponse> {
    const userId = user._id;
    if (!userId) {
      throw new BadRequestException('User not found');
    }

    return this.subscriptionService.getUserSubscription(userId);
  }

  @Post('cancel')
  async cancelSubscription(@User() user): Promise<ApiResponse> {
    const userId = user._id;
    if (!userId) {
      throw new BadRequestException('User not found');
    }

    return this.subscriptionService.cancelSubscription(userId);
  }

  @Get('billing-history')
async getBillingHistory(@User() user): Promise<ApiResponse> {
  const userId = user._id;
  if (!userId) {
    throw new BadRequestException('User not found');
  }

  return this.subscriptionService.getBillingHistory(userId);
}
  
  @Put('update')
  async updateSubscription(
    @Body('planId') planId: string,
    @User() user,
  ): Promise<ApiResponse> {
    const userId = user._id;
    if (!userId) {
      throw new BadRequestException('User not found');
    }

    if (!planId) {
      throw new BadRequestException('Plan is required');
    }

    return this.subscriptionService.updateSubscription(userId, planId);
  }
}
