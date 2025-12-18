import { IsString, IsNotEmpty } from 'class-validator';

export class FileKeyDto {
  @IsString()
  @IsNotEmpty()
  key: string;
}