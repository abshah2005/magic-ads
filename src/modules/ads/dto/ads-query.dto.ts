import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AdStatusEnum } from 'src/shared/enums/ad-status.enum';
import { AdStyleEnum } from 'src/shared/enums/ad-style.enum';
import { TargetDemographicEnum } from 'src/shared/enums/target.enum';
import { AgeRangeEnum } from 'src/shared/enums/age-range.enum';

export class AdQueryDto {
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
  folderId?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AdStatusEnum)
  status?: string;

  @IsOptional()
  @IsEnum(AdStyleEnum)
  adStyle?: string;

  @IsOptional()
  @IsEnum(TargetDemographicEnum)
  targetDemographic?: string;

  @IsOptional()
  @IsEnum(AgeRangeEnum)
  ageRange?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isDeleted?: boolean = false;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;
}