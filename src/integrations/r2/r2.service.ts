import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2PresignedUploadResponse } from './r2.types';
import { R2FileValidatorService, FileValidationConfig } from './r2-file-validator.service';

@Injectable()
export class R2Service {
  private readonly bucket = process.env.R2_BUCKET;
  private readonly s3: S3Client;

  constructor(private readonly fileValidator: R2FileValidatorService) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
      },
    });
  }

   async uploadFile(
    file: Express.Multer.File,
    options: {
      folder: string;
      identifier: string;
      contentType: string;
      validationConfig?: FileValidationConfig;
    },
  ): Promise<{ uploadUrl: string; key: string }> {
    const { folder, identifier,validationConfig  } = options;

    if (validationConfig) {
      this.fileValidator.validateFile(file, validationConfig);
    }

    const key = `${folder}/${identifier}/${crypto.randomUUID()}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3.send(command);
      const publicUrl = this.getPublicUrl(key);
      return { uploadUrl: publicUrl!!, key };
    } catch (error) {
      throw new Error('Failed to upload file to R2');
    }
  }


  async generatePresignedUploadKey(options: {
    folder: string; // e.g. "users", "products"
    identifier: string; // e.g. userId or productId
    contentType: string;
  }): Promise<R2PresignedUploadResponse> {
    const { folder, identifier, contentType } = options;

   
    // this key defines the folder ads an identifier and a random id for variance 
    const key = `${folder}/${identifier}/${crypto.randomUUID()}`;

    // Log the generated key
    console.log('Generated key:', key);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3, command, {
        expiresIn: 300,
      });

      return { uploadUrl, key };
    } catch (error) {
      throw new Error('Failed to generate presigned upload URL');
    }
  }

  /** Delete object from R2 */
  async deleteObject(key: string) {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return { deleted: true };
    } catch (err) {
      console.error('R2 delete failed:', err);
      return { deleted: false };
    }
  }

  getPublicUrl(key: string | null): string | null {
    if (!key) return null;
    return `${process.env.CDN_URL}${key}`;
  }

  async getSignedReadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }
}
