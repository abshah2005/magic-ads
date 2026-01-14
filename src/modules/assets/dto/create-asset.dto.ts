import {
  IsString,
  IsOptional,
  IsMongoId,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { AssetTypeEnum } from 'src/shared/enums/asset-type.enum';

export class CreateAssetDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  sourceLink: string;

  @IsOptional()
  @IsString()
  sourceLinkKey: string;

  @IsNotEmpty({ message: 'Folder ID is required' })
  @IsMongoId({ message: 'Folder ID must be a valid MongoDB ObjectId' })
  folderId: string;

  @IsNotEmpty({ message: 'Folder Type is required' })
  @IsEnum(AssetTypeEnum)
  assetType: string;

  @IsNotEmpty({ message: 'Workspace ID is required' })
  @IsMongoId({ message: 'Workspace ID must be a valid MongoDB ObjectId' })
  workspaceId: string;

  file?: Express.Multer.File;
}
