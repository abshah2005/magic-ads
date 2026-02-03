import { IsOptional, IsString } from 'class-validator';

export class CancelRequestDTO {
  @IsOptional()
  @IsString()
  planId: string | null;

  @IsOptional()
  @IsString()
  reason?: string ;
}
