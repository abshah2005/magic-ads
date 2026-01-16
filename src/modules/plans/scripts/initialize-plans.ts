import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan } from '../schemas/plans.schema';
import { PlanInterval, PlanType} from "src/shared/enums/plans.enum"

@Injectable()
export class PlanSeeder implements OnModuleInit {
  private readonly logger = new Logger(PlanSeeder.name);

  constructor(
    @InjectModel(Plan.name) private planModel: Model<Plan>,
  ) {}

  async onModuleInit() {
    await this.seedPlans();
  }

  private async seedPlans() {
    try {
      const count = await this.planModel.countDocuments();
      
      if (count === 0) {
        this.logger.log('Seeding plans data...');
        
        const plans = [
          // STARTER Plans
          {
            name: 'Starter Plan',
            type: PlanType.STARTER,
            description: 'Perfect for getting started with AI-powered ad creation',
            price: 0,
            interval: PlanInterval.MONTHLY,
            stripePriceId: 'price_starter_monthly',
            stripeProductId: 'prod_starter',
            aiCredits: 100,
            activeAdCampaigns: 1,
            assetStorage: 'Up to 3 Uploaded Assets',
            features: [
              'Basic AI Ad Generator',
              'Standard Rendering Queue',
              'Community Support',
            ],
            isPopular: false,
            isActive: true,
            sortOrder: 1,
          },
          {
            name: 'Starter Plan (Annual)',
            type: PlanType.STARTER,
            description: 'Perfect for getting started with AI-powered ad creation',
            price: 0,
            interval: PlanInterval.ANNUAL,
            stripePriceId: 'price_1SpqT7C2esy5ycVXYU6RGDjN',
            stripeProductId: 'prod_TnRLVMihRI429d',
            aiCredits: 1200, // 100 * 12
            activeAdCampaigns: 1,
            assetStorage: 'Up to 3 Uploaded Assets',
            features: [
              'Basic AI Ad Generator',
              'Standard Rendering Queue',
              'Community Support',
            ],
            isPopular: false,
            isActive: true,
            sortOrder: 2,
          },

          // PRO Plans
          {
            name: 'Pro Plan',
            type: PlanType.PRO,
            description: 'For growing businesses with advanced ad creation needs',
            price: 29,
            interval: PlanInterval.MONTHLY,
            stripePriceId: 'price_1SpqTuC2esy5ycVXhJHtikMX',
            stripeProductId: 'prod_TnRMVQbSMAKfWX',
            aiCredits: 2000,
            activeAdCampaigns: -1, // -1 for unlimited
            assetStorage: '100GB Asset Storage',
            features: [
              'Advanced AI Ad Generator',
              'Priority Rendering Queue',
              'Email Support',
              'Analytics Dashboard',
              'Custom Branding',
            ],
            isPopular: true,
            isActive: true,
            sortOrder: 3,
          },
          {
            name: 'Pro Plan (Annual)',
            type: PlanType.PRO,
            description: 'For growing businesses with advanced ad creation needs',
            price: 290, // 29 * 10 (discounted for annual)
            interval: PlanInterval.ANNUAL,
            stripePriceId: 'price_pro_annual',
            stripeProductId: 'prod_pro',
            aiCredits: 24000, // 2000 * 12
            activeAdCampaigns: -1,
            assetStorage: '100GB Asset Storage',
            features: [
              'Advanced AI Ad Generator',
              'Priority Rendering Queue',
              'Email Support',
              'Analytics Dashboard',
              'Custom Branding',
              '2 months free (annual discount)',
            ],
            isPopular: true,
            isActive: true,
            sortOrder: 4,
          },

          // ENTERPRISE Plans
          {
            name: 'Enterprise Plan',
            type: PlanType.ENTERPRISE,
            description: 'For large organizations with enterprise requirements',
            price: 99,
            interval: PlanInterval.MONTHLY,
            stripePriceId: 'price_enterprise_monthly',
            stripeProductId: 'prod_enterprise',
            aiCredits: 10000,
            activeAdCampaigns: -1,
            assetStorage: 'Unlimited Asset Storage',
            features: [
              'Premium AI Ad Generator',
              'Priority Rendering Queue',
              'Dedicated Account Manager',
              'API Access',
              'Priority Support (24/7)',
              'White-label Solutions',
              'Custom AI Models',
            ],
            isPopular: false,
            isActive: true,
            sortOrder: 5,
          },
          {
            name: 'Enterprise Plan (Annual)',
            type: PlanType.ENTERPRISE,
            description: 'For large organizations with enterprise requirements',
            price: 990, // 99 * 10 (discounted for annual)
            interval: PlanInterval.ANNUAL,
            stripePriceId: 'price_1SpqYrC2esy5ycVX7UTbSOVQ',
            stripeProductId: 'prod_TnRRYifYmvtu62',
            aiCredits: 120000, // 10000 * 12
            activeAdCampaigns: -1,
            assetStorage: 'Unlimited Asset Storage',
            features: [
              'Premium AI Ad Generator',
              'Priority Rendering Queue',
              'Dedicated Account Manager',
              'API Access',
              'Priority Support (24/7)',
              'White-label Solutions',
              'Custom AI Models',
              '2 months free (annual discount)',
            ],
            isPopular: false,
            isActive: true,
            sortOrder: 6,
          },
        ];

        await this.planModel.insertMany(plans);
        this.logger.log('Plans seeded successfully!');
      } else {
        this.logger.log('Plans already seeded');
      }
    } catch (error) {
      this.logger.error('Error seeding plans:', error);
    }
  }
}