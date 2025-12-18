export interface R2PresignedUploadResponse {
  uploadUrl: string;
  key: string;
}

export interface R2DeleteResponse {
  deleted: boolean;
}

export interface R2PublicUrlResponse {
  url: string | null;
}

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