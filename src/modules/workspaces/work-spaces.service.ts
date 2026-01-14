import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WorkspaceStrategy } from './strategies/work-space.strategy';
import { WorkspaceRepository } from './work-spaces.repository';
import { CreateWorkspaceDto } from './dto/create-workspaces.dto';
import { UpdateWorkspaceDto } from './dto/update-workspaces.dto';
import {  WorkspaceItemDto } from './dto/workspaces-list.dto';
import {  WorkspaceDocument } from './schemas/work-spaces.schema';
import { PaginationUtil } from 'src/common/utils/pagination.util';
import { ApiResponse } from 'src/common/responses/api-response';
import { CascadeService } from 'src/common/services/common.service';
import { CascadeConfigService } from 'src/common/services/cascade-config.service';
import { R2Service } from 'src/integrations/r2/r2.service';
import { FILE_VALIDATION_PRESETS } from 'src/integrations/r2/r2-file-validator.service';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly workspaceStrategy: WorkspaceStrategy,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly cascadeService: CascadeService, // ✅ Inject
    private readonly cascadeConfigService: CascadeConfigService,
    private readonly r2Service: R2Service,
  ) {}


  async executeCreate(
    createWorkspaceDto: CreateWorkspaceDto,
  ): Promise<ApiResponse> {
    if (createWorkspaceDto.imageFile) {
      const workSpaceImage = createWorkspaceDto.imageFile;
      const { uploadUrl, key } = await this.r2Service.uploadFile(
        workSpaceImage,
        {
          folder: 'workspaces/screenshots',
          identifier: createWorkspaceDto.creatorId,
          contentType: workSpaceImage.mimetype,
          validationConfig: FILE_VALIDATION_PRESETS.IMAGE,
        },
      );

      createWorkspaceDto.image = uploadUrl;
      createWorkspaceDto.imageKey = key;

      delete createWorkspaceDto.imageFile;
    }

    if (
      createWorkspaceDto.appScreenshotFiles &&
      createWorkspaceDto.appScreenshotFiles.length > 0
    ) {
      const appScreenshots: string[] = [];
      const appScreenshotKeys: string[] = [];

      for (const file of createWorkspaceDto.appScreenshotFiles) {
        const { uploadUrl, key } = await this.r2Service.uploadFile(file, {
          folder: 'workspaces/screenshots',
          identifier: createWorkspaceDto.creatorId,
          contentType: file.mimetype,
          validationConfig: FILE_VALIDATION_PRESETS.IMAGE,
        });

        const publicUrl = uploadUrl;
        appScreenshots.push(publicUrl!);
        appScreenshotKeys.push(key);
      }

      createWorkspaceDto.appScreenshots = appScreenshots;
      createWorkspaceDto.appScreenshotKeys = appScreenshotKeys;
    }

    delete createWorkspaceDto.appScreenshotFiles;

    const response = await this.workspaceRepository.create(createWorkspaceDto);
    return ApiResponse.success(response, 'Workspace created Successfully', 200);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<ApiResponse> {
    PaginationUtil.validate(page, limit);

    const { data, total } = await this.workspaceRepository.findAll(page, limit);
    const mappedData = data.map((workspace) =>
      this.mapToWorkspaceItemDto(workspace),
    );
    const meta = PaginationUtil.getMeta(page, limit, total);

    return ApiResponse.success(
      mappedData,
      'Workspace updated successfully',
      200,
      meta,
    );
  }

  async findById(id: string): Promise<ApiResponse> {
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return ApiResponse.success(
      workspace,
      'workspace fetched successfully',
      200,
    );
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<ApiResponse> {
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (updateWorkspaceDto.imageFile) {
      if (workspace.imageKey) {
        await this.r2Service.deleteObject(workspace.imageKey);
      }

      const { uploadUrl, key } = await this.r2Service.uploadFile(
        updateWorkspaceDto.imageFile,
        {
          folder: 'workspaces/images',
          identifier: workspace.creatorId.toString(),
          contentType: updateWorkspaceDto.imageFile.mimetype,
          validationConfig: FILE_VALIDATION_PRESETS.IMAGE,
        },
      );

      updateWorkspaceDto.image = uploadUrl;
      updateWorkspaceDto.imageKey = key;
    } else if (updateWorkspaceDto.deleteOld) {
      if (workspace.imageKey) {
        await this.r2Service.deleteObject(workspace.imageKey);
      }
      updateWorkspaceDto.image = null;
      updateWorkspaceDto.imageKey = null;
    }

    let currentScreenshots = [...(workspace.appScreenshots || [])];
    let currentKeys = [...(workspace.appScreenshotKeys || [])];

    if (
      updateWorkspaceDto.removeScreenshotIndexes &&
      updateWorkspaceDto.removeScreenshotIndexes.length > 0
    ) {
      const sortedIndexes = updateWorkspaceDto.removeScreenshotIndexes.sort(
        (a, b) => b - a,
      );

      for (const index of sortedIndexes) {
        if (index >= 0 && index < currentKeys.length) {
          await this.r2Service.deleteObject(currentKeys[index]);
          currentScreenshots.splice(index, 1);
          currentKeys.splice(index, 1);
        }
      }
    }

    if (
      updateWorkspaceDto.newScreenshotFiles &&
      updateWorkspaceDto.newScreenshotFiles.length > 0
    ) {
      if (currentScreenshots.length + updateWorkspaceDto.newScreenshotFiles.length > 3) {
        throw new BadRequestException(
          `Cannot add ${updateWorkspaceDto.newScreenshotFiles.length} screenshots. Maximum 3 screenshots allowed. Current: ${currentScreenshots.length}`,
        );
      }

      for (const file of updateWorkspaceDto.newScreenshotFiles) {
        const { uploadUrl, key } = await this.r2Service.uploadFile(file, {
          folder: 'workspaces/screenshots',
          identifier: workspace.creatorId.toString(),
          contentType: file.mimetype,
          validationConfig: FILE_VALIDATION_PRESETS.IMAGE,
        });

        currentScreenshots.push(uploadUrl);
        currentKeys.push(key);
      }
    }

    updateWorkspaceDto.appScreenshots = currentScreenshots;
    updateWorkspaceDto.appScreenshotKeys = currentKeys;

    delete updateWorkspaceDto.imageFile;
    delete updateWorkspaceDto.deleteOld;
    delete updateWorkspaceDto.newScreenshotFiles;
    delete updateWorkspaceDto.removeScreenshotIndexes;

    const response = await this.workspaceStrategy.executeUpdate(
      id,
      updateWorkspaceDto,
    );
    return ApiResponse.success(response, 'Workspace updated successfully', 200);
  }


  

  async softDelete(id: string): Promise<ApiResponse> {
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.isDeleted) {
      throw new NotFoundException('Workspace already marked for deletion');
    }

    const relations = this.cascadeConfigService.getWorkspaceCascadeRelations();
   

    const result = await this.cascadeService.softDeleteCascade(
      this.workspaceRepository.getModel(),
      id,
      relations,
    );
    return ApiResponse.success(
      { affectedCounts: result.cascadeResults },
      `Workspace and its related items marked deleted successfully`,
      200,
    );
  }

  async getDeletePreview(id: string): Promise<ApiResponse> {
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const relations = this.cascadeConfigService.getWorkspaceCascadeRelations();
    const preview = await this.cascadeService.getCascadePreview(
      this.workspaceRepository.getModel(),
      id,
      relations,
    );

    return ApiResponse.success(
      {
        workspace: {
          id: preview.parent._id,
          name: preview.parent.name,
        },
        impact: preview.cascadeCounts,
        totalAffected: preview.totalAffected,
      },
      'Delete preview generated successfully',
      200,
    );
  }

  async delete(id: string): Promise<ApiResponse> {
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const relations = this.cascadeConfigService.getWorkspaceCascadeRelations();
    
    const result = await this.cascadeService.hardDeleteCascade(
      this.workspaceRepository.getModel(),
      id,
      relations,
    );

    return ApiResponse.success(
      { affectedCounts: result.cascadeResults },
      `Workspace and its related items permanently deleted`,
      200,
    );
  }

  async restore(id: string): Promise<ApiResponse> {
    const workspace = await this.workspaceRepository.findById(id);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    if (!workspace.isDeleted) {
      throw new NotFoundException('Workspace not marked for deletion');
    }

    const relations = this.cascadeConfigService.getWorkspaceCascadeRelations();

    const result = await this.cascadeService.restoreCascade(
      this.workspaceRepository.getModel(),
      id,
      relations,
    );

    if (!result.parentRestored) {
      throw new NotFoundException('Workspace not found or cannot be restored');
    }

    return ApiResponse.success(
      { workspace, restoredCounts: result.cascadeResults },
      'Workspace and its related items restored successfully',
      200,
    );
  }

  async findByCreatorId(
    creatorId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<ApiResponse> {
    PaginationUtil.validate(page, limit);

    const { data, total } = await this.workspaceRepository.findByCreatorId(
      creatorId,
      page,
      limit,
    );
    const mappedData = data.map((workspace) =>
      this.mapToWorkspaceItemDto(workspace),
    );
    const meta = PaginationUtil.getMeta(page, limit, total);

    return ApiResponse.success(
      mappedData,
      'Owner workspaces fetched successfully',
      200,
      meta,
    );
  }

  private mapToWorkspaceItemDto(
    workspace: WorkspaceDocument,
  ): WorkspaceItemDto {
    return {
      _id: workspace._id.toString(),
      name: workspace.name,
      image: workspace.image,
      imageKey: workspace.imageKey,
      categoryId: workspace.categoryId,
      isDeleted: workspace.isDeleted,
      deletedAt: workspace.deletedAt,
      description: workspace.description,
      email: workspace.email,
      appScreenshots: workspace.appScreenshots,
      appScreenshotKeys: workspace.appScreenshotKeys,
      creatorId: workspace.creatorId.toString(),
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }
}
