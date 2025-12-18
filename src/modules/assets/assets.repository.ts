import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument } from './schemas/assets.schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetValidationUtil } from 'src/common/utils/asset-validation.util';
import { FolderService } from '../folders/folders.service';
import { WorkspaceValidationUtil } from 'src/common/utils/workspace-validation.util';
import { CreateWorkspaceDto } from '../workspaces/dto/create-workspaces.dto';
import { AssetQueryParams } from 'src/shared/interfaces/asset-query-params.interface';
import { R2Service } from 'src/integrations/r2/r2.service';

@Injectable()
export class AssetRepository {
  constructor(
    @InjectModel(Asset.name) private assetModel: Model<AssetDocument>,
    private readonly assetValidationUtil: AssetValidationUtil,
    private readonly workspaceValidationUtil: WorkspaceValidationUtil,
    private readonly foldersService: FolderService,
    private readonly r2Service: R2Service,
  ) {}

  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    await this.foldersService.findById(createAssetDto.folderId);
    await this.workspaceValidationUtil.validateWorkspaceExists(
      createAssetDto.workspaceId,
    );
    await this.validateAssetNameInFolder(
      createAssetDto.name,
      createAssetDto.folderId,
    );
    const asset = new this.assetModel(createAssetDto);
    return asset.save();
  }

  async findAll(queryParams: {
    page?: number;
    limit?: number;
    folderId?: string;
    workspaceId?: string;
    search?: string;
    assetType?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isDeleted?: boolean;
    createdFrom?: string;
    createdTo?: string;
  }): Promise<{
    data: AssetDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      folderId,
      workspaceId,
      search,
      assetType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isDeleted = false,
      createdFrom,
      createdTo,
    } = queryParams;

    const skip = (page - 1) * limit;
    const query: any = { isDeleted };

    if (folderId) {
      query.folderId = folderId;
    } else if (workspaceId) {
      query.workspaceId = workspaceId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sourceLink: { $regex: search, $options: 'i' } },
      ];
    }

    // Asset type filtering
    if (assetType) {
      query.assetType = assetType;
    }

    // Date range filtering
    if (createdFrom || createdTo) {
      query.createdAt = {};
      if (createdFrom) {
        query.createdAt.$gte = new Date(createdFrom);
      }
      if (createdTo) {
        query.createdAt.$lte = new Date(createdTo);
      }
    }

    // Sorting
    const sortOptions: any = {};
    const validSortFields = ['name', 'createdAt', 'updatedAt', 'assetType'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [data, total] = await Promise.all([
      this.assetModel
        .find(query)
        // .populate('folderId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.assetModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string): Promise<AssetDocument | null> {
    // return this.assetModel.findById(id).populate('folderId').exec();
    return this.assetModel.findById(id).exec();
  }

  async update(
    id: string,
    updateAssetDto: UpdateAssetDto,
  ): Promise<Asset | null> {
    const currentAsset = await this.assetModel.findById(id);
    if (!currentAsset) {
      return null;
    }

    if(updateAssetDto.sourceLink && updateAssetDto.sourceLinkKey){
      await this.r2Service.deleteObject(currentAsset.sourceLinkKey);
    }

    if (updateAssetDto.workspaceId) {
      await this.workspaceValidationUtil.validateWorkspaceExists(
        updateAssetDto.workspaceId,
      );
    }

    if (updateAssetDto.folderId) {
      await this.foldersService.findById(updateAssetDto.folderId);
    }

    if (updateAssetDto.name || updateAssetDto.folderId) {
      const nameToCheck = updateAssetDto.name || currentAsset.name;
      const folderToCheck =
        updateAssetDto.folderId || currentAsset.folderId.toString();

      await this.validateAssetNameInFolder(nameToCheck, folderToCheck, id);
    }



    return (
      this.assetModel
        .findByIdAndUpdate(id, updateAssetDto, { new: true })
        // .populate('folderId')
        .exec()
    );
  }

  async softDelete(id: string): Promise<AssetDocument | null> {
    const asset = await this.assetModel.findById(id).exec();

    if (!asset) {
      throw new NotFoundException(`Asset not found.`);
    }

    if (asset.isDeleted) {
      throw new BadRequestException(`Asset is already marked for deletion.`);
    }
    return this.assetModel.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true },
    );
    // .populate('folderId');
  }

  async restore(id: string): Promise<AssetDocument | null> {
    const asset = await this.assetModel.findById(id).exec();

    if (!asset) {
      throw new NotFoundException(`Asset not found.`);
    }

    if (!asset.isDeleted) {
      throw new BadRequestException(`Asset is not marked for deletion.`);
    }
    return this.assetModel.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deletedAt: null,
      },
      { new: true },
    );
    // .populate('folderId');
  }

  async delete(id: string): Promise<Asset | null> {
    const asset = await this.assetModel.findById(id).exec();

    if (!asset) {
      throw new NotFoundException(`Asset not found.`);
    }
    await this.r2Service.deleteObject(asset.sourceLinkKey);
    return this.assetModel.findByIdAndDelete(id).exec();
  }

  private async validateAssetNameInFolder(
    name: string,
    folderId: string,
    excludeAssetId?: string,
  ): Promise<void> {
    const query: any = {
      name,
      folderId,
      isDeleted: false,
    };

    // Exclude current asset when updating
    if (excludeAssetId) {
      query._id = { $ne: excludeAssetId };
    }

    const existingAsset = await this.assetModel.findOne(query);

    if (existingAsset) {
      throw new ConflictException(
        `An asset with the name '${name}' already exists in this folder`,
      );
    }
  }
}
