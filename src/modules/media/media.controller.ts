import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiResponse } from 'src/common/responses/api-response';
import { User } from 'src/common/decorators/user.decorator';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { FileKeyDto } from './dto/file-key.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  async generateUploadUrl(
    @Body() generateUploadUrlDto: GenerateUploadUrlDto,
    @User() user: any,
  ) {
    const uploadResponse = await this.mediaService.generateUploadUrl({
      folder: generateUploadUrlDto.folder,
      identifier: generateUploadUrlDto.identifier,
      contentType: generateUploadUrlDto.contentType,
    });

    return ApiResponse.success(uploadResponse, 'Upload URL generated successfully');
  }

  @Get('file')
  async getFile(@Query() fileKeyDto: FileKeyDto) {
    const fileUrl = await this.mediaService.getFileUrl(fileKeyDto.key);
    return ApiResponse.success({ url: fileUrl }, 'File URL retrieved successfully');
  }

  @Get('signed-url')
  async getSignedUrl(@Query() fileKeyDto: FileKeyDto) {
    const signedUrl = await this.mediaService.getSignedUrl(fileKeyDto.key);
    return ApiResponse.success({ url: signedUrl }, 'Signed URL generated successfully');
  }

  @Delete('file')
  async deleteFile(@Query() fileKeyDto: FileKeyDto) {
    const result = await this.mediaService.deleteFile(fileKeyDto.key);
    return ApiResponse.success(null, 'File deleted successfully');
  }
}