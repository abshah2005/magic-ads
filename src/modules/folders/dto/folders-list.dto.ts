
export class FolderListDto {
  page: number;
  limit: number;
  total: number;
  data: FolderItemDto[];
}

export class FolderItemDto {
  _id: string; 
  name: string;
  workspaceId:string;
  folderTypeId: string;
  isDeleted: boolean;
  deletedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}