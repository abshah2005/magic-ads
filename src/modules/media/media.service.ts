import { Injectable } from '@nestjs/common';
import { R2Service } from 'src/integrations/r2/r2.service';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';

@Injectable()
export class MediaService {
  constructor(private readonly r2Service: R2Service) {}

  async generateUploadUrl(generateUploadUrlDto: GenerateUploadUrlDto) {
    return this.r2Service.generatePresignedUploadKey(generateUploadUrlDto);
  }

  async deleteFile(key: string) {
    return this.r2Service.deleteObject(key);
  }

  async getFileUrl(key: string) {
    return this.r2Service.getPublicUrl(key);
  }

  async getSignedUrl(key: string) {
    return this.r2Service.getSignedReadUrl(key);
  }
}