export interface FolderQuery {
  name: string;
  workspaceId: string;
  isDeleted: boolean;
  _id?: { $ne: string };
}
