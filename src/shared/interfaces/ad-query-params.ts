


export interface AdQuery {
  name?: string | { $regex: string; $options: string };
  folderId?: string;
  workspaceId?: string;
  status?: string;
  adStyle?: string;
  targetDemographic?: string;
  ageRange?: string;
  duration?: number;
  isDeleted?: boolean;
  createdAt?: { $gte?: Date; $lte?: Date };
  _id?: { $ne: string };
}

export type SortOrder = 1 | -1;
export type AdSortOptions = Record<string, SortOrder>;
