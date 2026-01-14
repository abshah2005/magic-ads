export interface AssetQuery {
  name?: string | { $regex: string; $options: string };
  folderId?: string;
  workspaceId?: string;
  assetType?: string;
  isDeleted?: boolean;
  createdAt?: { $gte?: Date; $lte?: Date };
  sourceLink?: { $regex: string; $options: string };
  $or?: Array<{ name?: { $regex: string; $options: string }; sourceLink?: { $regex: string; $options: string } }>;
  _id?: { $ne: string };
}

export type SortOrder = 1 | -1;
export type AssetSortOptions = Record<string, SortOrder>;