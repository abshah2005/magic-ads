import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Folder, FolderDocument } from './schemas/folders.schema';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { WorkspaceRepository } from 'src/modules/workspaces/work-spaces.repository';
import { WorkspaceValidationUtil } from 'src/common/utils/workspace-validation.util';

@Injectable()
export class FolderRepository {
  constructor(
    @InjectModel(Folder.name) private folderModel: Model<Folder>,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly workspaceValidationUtil: WorkspaceValidationUtil,
  ) {}

  async create(createFolderDto: CreateFolderDto): Promise<Folder> {
    await this.workspaceValidationUtil.validateWorkspaceExists(
      createFolderDto.workspaceId,
    );

    await this.workspaceValidationUtil.validateFolderNameUniqueness(
      createFolderDto.name,
      createFolderDto.workspaceId,
    );
    const folder = new this.folderModel(createFolderDto);
    return folder.save();
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{ data: FolderDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const data = await this.folderModel
      .find()
      // .populate('workspaceId')
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.folderModel.countDocuments();
    return { data, total };
  }

  async findById(id: string): Promise<FolderDocument | null> {
    // return this.folderModel.findById(id).populate('workspaceId').exec();
    return this.folderModel.findById(id).exec();

  }

  async update(
    id: string,
    updateFolderDto: UpdateFolderDto,
  ): Promise<Folder | null> {
    const currentFolder = await this.folderModel.findById(id);
    if (!currentFolder) {
      return null;
    }

    if (
      updateFolderDto.workspaceId &&
      updateFolderDto.workspaceId !== currentFolder.workspaceId.toString()
    ) {
      await this.workspaceValidationUtil.validateWorkspaceExists(
        updateFolderDto.workspaceId,
      );
    }

    if (updateFolderDto.name) {
      const targetWorkspace =
        updateFolderDto.workspaceId || currentFolder.workspaceId;
      await this.workspaceValidationUtil.validateFolderNameUniqueness(
        updateFolderDto.name,
        targetWorkspace.toString(),
        currentFolder.id,
      );
    }

    return this.folderModel
      .findByIdAndUpdate(id, updateFolderDto, { new: true })
      // .populate('workspaceId')
      .exec();
  }

  async delete(id: string): Promise<Folder | null> {
    return this.folderModel.findByIdAndDelete(id).exec();
  }

   getModel(): Model<Folder> {
    return this.folderModel;
  }

  

  async softDelete(id: string): Promise<FolderDocument | null> {
    return this.folderModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: true,
          deletedAt: new Date(),
        },
        { new: true },
      )
      .populate('workspaceId');
  }

  async restore(id: string): Promise<FolderDocument | null> {
    return this.folderModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: false,
          deletedAt: null,
        },
        { new: true },
      )
      .populate('workspaceId');
  }

  async findByWorkspaceId(
    workspaceId: string,
    page: number,
    limit: number,
  ): Promise<{ data: FolderDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const data = await this.folderModel
      .find({ workspaceId })
      // .populate('workspaceId')
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.folderModel.countDocuments({ workspaceId });
    return { data, total };
  }
}
