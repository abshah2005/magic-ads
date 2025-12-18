import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-users.dto';
import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { Multer } from 'multer';
import { Transform } from 'class-transformer';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['googleId','email'] as const),
) {
  @IsOptional()
  @IsString()
  key?: string | null;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  deleteOld?: boolean;

  file?: Express.Multer.File;
}
