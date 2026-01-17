import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AdjustCreditsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  rollbackOnFail?: boolean;
}