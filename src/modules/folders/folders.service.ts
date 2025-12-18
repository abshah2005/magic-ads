import { Injectable, NotFoundException } from '@nestjs/common';
import { FolderStrategy } from './strategies/folder.strategy';
import { FolderRepository } from './folders.repository';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderListDto, FolderItemDto } from './dto/folders-list.dto';
import { Folder, FolderDocument } from './schemas/folders.schema';
import { PaginationUtil } from 'src/common/utils/pagination.util';
import { ApiResponse } from 'src/common/responses/api-response';
import { CascadeService } from 'src/common/services/common.service';
import { CascadeConfigService } from 'src/common/services/cascade-config.service';

@Injectable()
export class FolderService {
  constructor(
    private readonly folderStrategy: FolderStrategy,
    private readonly folderRepository: FolderRepository,
    private readonly cascadeService: CascadeService, // ✅ Inject
    private readonly cascadeConfigService: CascadeConfigService,
  ) {}

  async create(createFolderDto: CreateFolderDto): Promise<ApiResponse> {
    const response = await this.folderStrategy.executeCreate(createFolderDto);
    return ApiResponse.success(response, 'Folder created Successfully', 200);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<ApiResponse> {
    PaginationUtil.validate(page, limit);

    const { data, total } = await this.folderRepository.findAll(page, limit);
    const mappedData = data.map((folder) => this.mapToFolderItemDto(folder));
    const meta = PaginationUtil.getMeta(page, limit, total);

    return ApiResponse.success(
      mappedData,
      'Folders fetched successfully',
      200,
      meta,
    );
  }

  async findById(id: string): Promise<ApiResponse> {
    const folder = await this.folderRepository.findById(id);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return ApiResponse.success(folder, 'Folder fetched successfully', 200);
  }

  async update(
    id: string,
    updateFolderDto: UpdateFolderDto,
  ): Promise<ApiResponse> {
    await this.findById(id);
    const response = await this.folderStrategy.executeUpdate(
      id,
      updateFolderDto,
    );
    return ApiResponse.success(response, 'Folder updated successfully', 200);
  }

  async getDeletePreview(id: string): Promise<ApiResponse> {
    const folder = await this.folderRepository.findById(id);
    if (!folder) {
      throw new NotFoundException('folder not found');
    }

    const relations = this.cascadeConfigService.getFolderCascadeRelations();
    const preview = await this.cascadeService.getCascadePreview(
      this.folderRepository.getModel(),
      id,
      relations,
    );

    return ApiResponse.success(
      {
        folder: {
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


  async softDelete(id: string): Promise<ApiResponse> {
    const folder = await this.folderRepository.findById(id);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if(folder.isDeleted){
      throw new NotFoundException('Folder is already marked as deleted');
      
    }

    // Get preview first
    const relations = this.cascadeConfigService.getFolderCascadeRelations();
    const preview = await this.cascadeService.getCascadePreview(
      this.folderRepository.getModel(),
      id,
      relations
    );

    // Perform cascade soft delete
    const result = await this.cascadeService.softDeleteCascade(
      this.folderRepository.getModel(),
      id,
      relations
    );

    return ApiResponse.success(
      { affectedCounts: result.cascadeResults },
      `Folder and its related items marked deleted successfully`,
      200
    );
  }

  
  async delete(id: string): Promise<ApiResponse> {
    const folder = await this.folderRepository.findById(id);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Get preview first
    const relations = this.cascadeConfigService.getFolderCascadeRelations();
    const preview = await this.cascadeService.getCascadePreview(
      this.folderRepository.getModel(),
      id,
      relations
    );

    // Perform cascade hard delete
    const result = await this.cascadeService.hardDeleteCascade(
      this.folderRepository.getModel(),
      id,
      relations
    );

    return ApiResponse.success(
      { affectedCounts: result.cascadeResults },
      `Folder and its related items permanently deleted`,
      200
    );
  }

  // ✅ Add cascade restore (same pattern as workspace)
  async restore(id: string): Promise<ApiResponse> {
    const folder = await this.folderRepository.findById(id);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if(!folder.isDeleted){
      throw new NotFoundException('Folder is not marked as deleted');
      
    }
    const relations = this.cascadeConfigService.getFolderCascadeRelations();
    
    const result = await this.cascadeService.restoreCascade(
      this.folderRepository.getModel(),
      id,
      relations
    );

    if (!result.parentRestored) {
      throw new NotFoundException('Folder not found or cannot be restored');
    }

    
    return ApiResponse.success(
      { folder, restoredCounts: result.cascadeResults },
      'Folder and its related items restored successfully',
      200
    );
  }


  async findByWorkspaceId(
    workspaceId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<ApiResponse> {
    PaginationUtil.validate(page, limit);

    const { data, total } = await this.folderRepository.findByWorkspaceId(
      workspaceId,
      page,
      limit,
    );
    const mappedData = data.map((folder) => this.mapToFolderItemDto(folder));
    const meta = PaginationUtil.getMeta(page, limit, total);

    return ApiResponse.success(
      mappedData,
      'Workspace folders fetched successfully',
      200,
      meta,
    );
  }

  private mapToFolderItemDto(folder: FolderDocument): FolderItemDto {
    return {
      _id: folder._id.toString(),
      name: folder.name,
      // image: folder.image,
      workspaceId: folder.workspaceId as any,
      folderTypeId: folder.folderTypeId,
      isDeleted: folder.isDeleted,
      deletedAt: folder.deletedAt,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }
}
