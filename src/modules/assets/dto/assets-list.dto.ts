export class AssetListDto {
  page: number;
  limit: number;
  total: number;
  data: AssetItemDto[];
}

export class AssetItemDto {
  _id: string;
  name: string;
  assetType:string;
  sourceLink: string ;
  sourceLinkKey:string;
  // folderId: {
  //   _id: string;
  //   name: string;
  // };
  folderId: string;
  workSpaceId:String;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isDeleted: boolean;
}