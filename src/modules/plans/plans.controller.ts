import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpStatus,
  HttpCode,
  Patch,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPlanDto: CreatePlanDto): Promise<ApiResponse> {
    return this.plansService.create(createPlanDto);
  }

  @Public()
  @Get()
  async findAll(): Promise<ApiResponse> {
    return this.plansService.findAll();
  }

  @Get('active')
  async findActivePlans(): Promise<ApiResponse> {
    return this.plansService.findActivePlans();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ApiResponse> {
    return this.plansService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ): Promise<ApiResponse> {
    return this.plansService.update(id, updatePlanDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse> {
    return this.plansService.delete(id);
  }

  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string): Promise<ApiResponse> {
    return this.plansService.toggleStatus(id);
  }
}
