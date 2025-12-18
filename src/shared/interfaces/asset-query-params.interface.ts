export interface AssetQueryParams {
  page: number;
  limit: number;
  folderId?: string;
  workspaceId?: string;
  search?: string;
  assetType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDeleted?: boolean;
  createdFrom?: string;
  createdTo?: string;
}