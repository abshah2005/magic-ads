import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsArray,
  ArrayMaxSize,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import { CategoryEnum } from '../../../shared/enums/category.enum';

export class CreateWorkspaceDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image?: string | null;

  @IsOptional()
  @IsString()
  imageKey?: string | null;

  @IsOptional()
  @IsString()
  description: string;

  @IsNotEmpty({ message: 'Category ID is required' })
  @IsEnum(CategoryEnum)
  categoryId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  appScreenshots?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  appScreenshotKeys?: string[];

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'creator ID is required' })
  @IsMongoId({ message: 'creator ID must be a valid MongoDB ObjectId' })
  creatorId: string;

  @IsOptional()
  imageFile?: Express.Multer.File | null;

  @IsOptional()
  appScreenshotFiles?: Express.Multer.File[] | null;
}
