import { PartialType } from '@nestjs/mapped-types';
import { CreateAdDto } from './create-ad.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { AdStatusEnum } from 'src/shared/enums/ad-status.enum';

export class UpdateAdDto extends PartialType(CreateAdDto) {
  @IsOptional()
  @IsEnum(AdStatusEnum)
  status: string;
}
