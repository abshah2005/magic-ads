export class WorkspaceListDto {
  page: number;
  limit: number;
  total: number;
  data: WorkspaceItemDto[];
}

export class WorkspaceItemDto {
  _id: string;
  description?: string;
  name: string;
  image?: string;
  imageKey?: string;
  isDeleted: Boolean;
  deletedAt: Date;
  categoryId: string;
  email: string;
  appScreenshots?: string[];
  appScreenshotKeys?: string[];
  // creatorId: OwnerDto;
  creatorId: String;

  createdAt: Date;
  updatedAt: Date;
}

export class OwnerDto {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}