export class AdListDto {
  page: number;
  limit: number;
  total: number;
  data: AdItemDto[];
}

export class AdItemDto {
  _id: string;
  name: string;
  duration: number;
  adStyle: string;
  numberOfVariations: number;
  targetDemographic: string;
  ageRange: string;
  featuresToHighlight: string[];
  status: string;
  estimatedCredits: number;
  // folderId: {
  //   _id: string;
  //   name: string;
  // };
  folderId:string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isDeleted: boolean;
}