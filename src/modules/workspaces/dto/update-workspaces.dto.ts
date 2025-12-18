import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateWorkspaceDto } from './create-workspaces.dto';
import {
  IsOptional,
  IsBoolean,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
} from 'class-validator';

import { Transform, Type } from 'class-transformer';

export class UpdateWorkspaceDto extends PartialType(CreateWorkspaceDto) {
  @IsOptional()
  @IsString()
  imageFile?: Express.Multer.File;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  deleteOld?: boolean;

  @IsOptional()
  newScreenshotFiles?: Express.Multer.File[];

  // Indexes of screenshots to remove (0-based)
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(2, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  })
  removeScreenshotIndexes?: number[];
}
