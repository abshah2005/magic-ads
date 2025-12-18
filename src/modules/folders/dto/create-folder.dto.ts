import { IsString, IsEnum, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';
import { FolderTypeEnum } from '../../../shared/enums/folder-type.enum';

export class CreateFolderDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image: string;

  @IsNotEmpty({ message: 'Workspace ID is required' })
  @IsMongoId({ message: 'Workspace ID must be a valid MongoDB ObjectId' })
  workspaceId: string;

  @IsNotEmpty({ message: 'Folder Type is required' })
  @IsEnum(FolderTypeEnum)
  folderTypeId: string;
}