import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plans.schema';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlanRepository {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
  ) {}

  async create(createPlanDto: CreatePlanDto): Promise<Plan> {
    // Check if plan type and interval combination already exists
    const existingPlan = await this.planModel.findOne({
      type: createPlanDto.type,
      interval: createPlanDto.interval,
    });

    if (existingPlan) {
      throw new ConflictException(
        `A ${createPlanDto.interval} plan of type '${createPlanDto.type}' already exists`,
      );
    }

    const plan = new this.planModel(createPlanDto);
    return plan.save();
  }

  async findAll(queryParams: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    interval?: string;
    isPopular?: boolean;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: PlanDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      interval,
      isPopular,
      isActive,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
    } = queryParams;

    const skip = (page - 1) * limit;
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Type filtering
    if (type) {
      query.type = type;
    }

    // Interval filtering
    if (interval) {
      query.interval = interval;
    }

    // Popular filtering
    if (isPopular !== undefined) {
      query.isPopular = isPopular;
    }

    // Active filtering
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    // Sorting
    const sortOptions: any = {};
    const validSortFields = ['name', 'price', 'sortOrder', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'sortOrder';
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.planModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.planModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string): Promise<PlanDocument | null> {
    return this.planModel.findById(id).exec();
  }

  async findByTypeAndInterval(type: string, interval: string): Promise<PlanDocument | null> {
    return this.planModel.findOne({ type, interval }).exec();
  }

  async findActivePlans(): Promise<PlanDocument[]> {
    return this.planModel.find({ isActive: true }).sort({ sortOrder: 1 }).exec();
  }

  async update(id: string, updatePlanDto: UpdatePlanDto): Promise<Plan | null> {
    const currentPlan = await this.planModel.findById(id);
    if (!currentPlan) {
      throw new NotFoundException(`Plan not found`);
    }

    if (updatePlanDto.type || updatePlanDto.interval) {
      const typeToCheck = updatePlanDto.type || currentPlan.type;
      const intervalToCheck = updatePlanDto.interval || currentPlan.interval;

      const existingPlan = await this.planModel.findOne({
        type: typeToCheck,
        interval: intervalToCheck,
        _id: { $ne: id },
      });

      if (existingPlan) {
        throw new ConflictException(
          `A ${intervalToCheck} plan of type '${typeToCheck}' already exists`,
        );
      }
    }

    return this.planModel
      .findByIdAndUpdate(id, updatePlanDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Plan | null> {
    const plan = await this.planModel.findById(id);
    if (!plan) {
      throw new NotFoundException(`Plan not found`);
    }
    return this.planModel.findByIdAndDelete(id).exec();
  }

  async toggleStatus(id: string): Promise<Plan | null> {
    const plan = await this.planModel.findById(id);
    if (!plan) {
      throw new NotFoundException(`Plan not found`);
    }

    return this.planModel
      .findByIdAndUpdate(
        id,
        { isActive: !plan.isActive },
        { new: true },
      )
      .exec();
  }
}