import { Injectable, BadRequestException } from '@nestjs/common';

export interface FileValidationConfig {
  readonly allowedMimeTypes: readonly string[];
  readonly maxFileSizeInMB: number;
}

export const FILE_VALIDATION_PRESETS = {
  IMAGE: {
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    maxFileSizeInMB: 10,
  },
  DOCUMENT: {
    allowedMimeTypes: ['application/pdf'],
    maxFileSizeInMB: 50,
  },
  VIDEO: {
    allowedMimeTypes: ['video/mp4'],
    maxFileSizeInMB: 500,
  },
  ASSET: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'],
    maxFileSizeInMB: 50,
  },
} as const;

@Injectable()
export class R2FileValidatorService {

  validateFile(file: Express.Multer.File, config: FileValidationConfig): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > config.maxFileSizeInMB) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${config.maxFileSizeInMB}MB. Current size: ${fileSizeInMB.toFixed(2)}MB`,
      );
    }

    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type '${file.mimetype}' is not allowed. Allowed types: ${Array.from(config.allowedMimeTypes).join(', ')}`,
      );
    }
  }

  validateFiles(files: Express.Multer.File[], config: FileValidationConfig): void {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    files.forEach((file, index) => {
      try {
        this.validateFile(file, config);
      } catch (error) {
        throw new BadRequestException(
          `File at index ${index} (${file.originalname}): ${error.message}`,
        );
      }
    });
  }
}