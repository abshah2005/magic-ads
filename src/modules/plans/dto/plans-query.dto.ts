import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PlanInterval, PlanType } from 'src/shared/enums/plans.enum';


export class PlanQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PlanType)
  type?: string;

  @IsOptional()
  @IsEnum(PlanInterval)
  interval?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string = 'sortOrder';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}