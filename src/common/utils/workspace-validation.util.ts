import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WorkspaceRepository } from 'src/modules/workspaces/work-spaces.repository';
import { WorkspaceDocument } from 'src/modules/workspaces/schemas/work-spaces.schema';
import { Folder } from 'src/modules/folders/schemas/folders.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FolderQuery } from 'src/shared/interfaces/folder-query-params';
@Injectable()
export class WorkspaceValidationUtil {
 
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    @InjectModel(Folder.name) private folderModel: Model<Folder>,
  ) {}

  async validateWorkspaceExists(
    workspaceId: string,
    throwError: boolean = true,
  ): Promise<WorkspaceDocument | null> {
    try {
      const workspace = await this.workspaceRepository.findById(workspaceId);

      if (!workspace) {
        if (throwError) {
          throw new NotFoundException(
            `Workspace not found`,
          );
        }
        return null;
      }

      if (workspace.isDeleted) {
        if (throwError) {
          throw new BadRequestException(
            `Workspace has been deleted`,
          );
        }
        return null;
      }

      return workspace;
    } catch (error) {
      throw error;
    }
  }

  async validateFolderNameUniqueness(
    folderName: string,
    workspaceId: string,
    excludeFolderId?: string,
  ): Promise<void> {
    try {
      const query: FolderQuery = {
        name: folderName,
        workspaceId: workspaceId,
        isDeleted: false,
      };

      if (excludeFolderId) {
        query._id = { $ne: excludeFolderId };
      }

      const existingFolder = await this.folderModel.findOne(query);

      if (existingFolder) {
        throw new BadRequestException(
          `Folder with name "${folderName}" already exists in this workspace`,
        );
      }
    } catch (error) {
      throw error;
    }
  }
}
