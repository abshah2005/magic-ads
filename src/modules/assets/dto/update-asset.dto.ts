import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @IsOptional()
  @IsString()
  sourceType: string;
}
