import { WorkspaceDocument } from "src/modules/workspaces/schemas/work-spaces.schema";

export class FolderListDto {
  page: number;
  limit: number;
  total: number;
  data: FolderItemDto[];
}

export class FolderItemDto {
  _id: string; 
  name: string;
  // image : string |null;
  // workspaceId: {
  //   _id: string;
  //   name: string;
  //   picture: string;
  //   categoryId: string;
  //   email: string;
  //   creatorId: string;
  //   isDeleted: boolean;
  //   createdAt: Date;
  //   updatedAt: Date;
  // };
  workspaceId:string;
  folderTypeId: string;
  isDeleted: boolean;
  deletedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}