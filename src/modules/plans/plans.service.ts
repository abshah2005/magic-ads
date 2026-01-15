import { Injectable, NotFoundException } from '@nestjs/common';
import { PlanRepository } from './plans.repository';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanItemDto } from './dto/plans-list.dto';
import { PlanDocument } from './schemas/plans.schema';
import { ApiResponse } from 'src/common/responses/api-response';

@Injectable()
export class PlansService {
  constructor(private readonly planRepository: PlanRepository) {}

  async create(createPlanDto: CreatePlanDto): Promise<ApiResponse> {
    const plan = await this.planRepository.create(createPlanDto);
    return ApiResponse.success(plan, 'Plan created successfully', 201);
  }



  async findAll(): Promise<ApiResponse> {

   const plans = await this.planRepository.getAll();
  const mappedData=plans.map(plan => this.mapToPlanItemDto(plan));
    

    return ApiResponse.success(
      mappedData,
      'Plans fetched successfully',
      200,
    );
  }

  async findById(id: string): Promise<ApiResponse> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return ApiResponse.success(plan, 'Plan fetched successfully', 200);
  }

  async findActivePlans(): Promise<ApiResponse> {
    const plans = await this.planRepository.findActivePlans();
    const mappedData = plans.map((plan) => this.mapToPlanItemDto(plan));
    return ApiResponse.success(mappedData, 'Active plans fetched successfully', 200);
  }

  async update(id: string, updatePlanDto: UpdatePlanDto): Promise<ApiResponse> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const updatedPlan = await this.planRepository.update(id, updatePlanDto);
    return ApiResponse.success(updatedPlan, 'Plan updated successfully', 200);
  }

  async delete(id: string): Promise<ApiResponse> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    await this.planRepository.delete(id);
    return ApiResponse.success(null, 'Plan deleted successfully', 200);
  }

  async toggleStatus(id: string): Promise<ApiResponse> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const updatedPlan = await this.planRepository.toggleStatus(id);
    return ApiResponse.success(updatedPlan, 'Plan status toggled successfully', 200);
  }

  private mapToPlanItemDto(plan: PlanDocument): PlanItemDto {    
    return {
      _id: plan._id.toString(),
      name: plan.name,
      type: plan.type,
      description: plan.description,
      price: plan.price,
      interval: plan.interval,
      stripePriceId: plan.stripePriceId,
      stripeProductId: plan.stripeProductId,
      aiCredits: plan.aiCredits,
      activeAdCampaigns: plan.activeAdCampaigns,
      assetStorage: plan.assetStorage,
      features: plan.features,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}