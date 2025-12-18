import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { WorkspaceRepository } from 'src/modules/workspaces/work-spaces.repository';
import { WorkspaceDocument } from 'src/modules/workspaces/schemas/work-spaces.schema';
import { Folder, FolderDocument } from 'src/modules/folders/schemas/folders.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
@Injectable()
export class WorkspaceValidationUtil {
  private readonly logger = new Logger(WorkspaceValidationUtil.name,
    
  );

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
      const query: any = {
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
