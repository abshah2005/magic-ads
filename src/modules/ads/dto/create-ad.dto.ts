import {
  IsString,
  IsOptional,
  IsMongoId,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { AdStyleEnum } from 'src/shared/enums/ad-style.enum';
import { AgeRangeEnum } from 'src/shared/enums/age-range.enum';
import { FeaturesToHighlightEnum } from 'src/shared/enums/features-to-highlight.enum';
import { TargetDemographicEnum } from 'src/shared/enums/target.enum';

export class CreateAdDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Folder ID is required' })
  @IsMongoId({ message: 'Folder ID must be a valid MongoDB ObjectId' })
  folderId: string;

  @IsNotEmpty({ message: 'Workspace ID is required' })
  @IsMongoId({ message: 'Workspace ID must be a valid MongoDB ObjectId' })
  workspaceId: string;

  @IsNotEmpty({ message: 'Duration is required' })
  @IsNumber()
  duration: number;

  @IsNotEmpty({ message: 'Ad style is required' })
  @IsEnum(AdStyleEnum)
  adStyle: string;

  @IsNotEmpty({ message: 'Number of variations is required' })
  @IsNumber()
  @Min(1)
  @Max(10)
  numberOfVariations: number;

  @IsNotEmpty({ message: 'Target demographic is required' })
  @IsEnum(TargetDemographicEnum)
  targetDemographic: string;

  @IsNotEmpty({ message: 'Age range is required' })
  @IsEnum(AgeRangeEnum)
  ageRange: string;

  @IsOptional()
  @IsArray()
  @IsEnum(FeaturesToHighlightEnum, { each: true })
  featuresToHighlight?: FeaturesToHighlightEnum[];

  //   @IsOptional()
  //   @IsMongoId({ message: 'Source link must be a valid MongoDB ObjectId' })
  //   sourceLink?: string;

  @IsOptional()
  @IsNumber()
  estimatedCredits?: number;
}
