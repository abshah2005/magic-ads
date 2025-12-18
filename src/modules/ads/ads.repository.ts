import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ad, AdDocument } from './schemas/ads.schema';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { AdValidationUtil } from 'src/common/utils/ad-validation.util';
import { FolderService } from '../folders/folders.service';
import { WorkspaceValidationUtil } from 'src/common/utils/workspace-validation.util';

@Injectable()
export class AdRepository {
  constructor(
    @InjectModel(Ad.name) private adModel: Model<AdDocument>,
    private readonly adValidationUtil: AdValidationUtil,
    private readonly workspaceValidationUtil: WorkspaceValidationUtil,
    private readonly foldersService: FolderService,
  ) {}

  async create(createAdDto: CreateAdDto): Promise<Ad> {
    await this.foldersService.findById(createAdDto.folderId);
    await this.workspaceValidationUtil.validateWorkspaceExists(
      createAdDto.workspaceId,
    );
    await this.validateAdNameInFolder(createAdDto.name, createAdDto.folderId);
    const ad = new this.adModel(createAdDto);
    return ad.save();
  }



  async findAll(queryParams: {
    page?: number;
    limit?: number;
    folderId?: string;
    workspaceId?: string;
    search?: string;
    status?: string;
    adStyle?: string;
    targetDemographic?: string;
    ageRange?: string;
    duration?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isDeleted?: boolean;
    createdFrom?: string;
    createdTo?: string;
  }): Promise<{
    data: AdDocument[];
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
      status,
      adStyle,
      targetDemographic,
      ageRange,
      duration,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isDeleted = false,
      createdFrom,
      createdTo,
    } = queryParams;

    const skip = (page - 1) * limit;
    const query: any = { isDeleted };

    // Folder or Workspace filtering
    if (folderId) {
      query.folderId = folderId;
    } else if (workspaceId) {
      query.workspaceId = workspaceId;
    }

    // Search functionality - searches in name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Status filtering
    if (status) {
      query.status = status;
    }

    // Ad style filtering
    if (adStyle) {
      query.adStyle = adStyle;
    }

    // Target demographic filtering
    if (targetDemographic) {
      query.targetDemographic = targetDemographic;
    }

    // Age range filtering
    if (ageRange) {
      query.ageRange = ageRange;
    }

    // Duration filtering
    if (duration) {
      query.duration = duration;
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
    const validSortFields = ['name', 'createdAt', 'updatedAt', 'status', 'adStyle', 'duration'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [data, total] = await Promise.all([
      this.adModel
        .find(query)
        // .populate('folderId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.adModel.countDocuments(query),
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

  async findById(id: string): Promise<AdDocument | null> {
    // return this.adModel.findById(id).populate('folderId').exec();
    return this.adModel.findById(id).exec();

  }

  async update(id: string, updateAdDto: UpdateAdDto): Promise<Ad | null> {
    const currentAd = await this.adModel.findById(id);
    if (!currentAd) {
      return null;
    }
    if (updateAdDto.name || updateAdDto.folderId) {
      const nameToCheck = updateAdDto.name || currentAd.name;
      const folderToCheck =
        updateAdDto.folderId || currentAd.folderId.toString();

      await this.validateAdNameInFolder(nameToCheck, folderToCheck, id);
    }

    if (updateAdDto.workspaceId) {
      await this.workspaceValidationUtil.validateWorkspaceExists(
        updateAdDto.workspaceId,
      );
    }

    if (updateAdDto.folderId) {
      await this.foldersService.findById(updateAdDto.folderId);
    }

    return this.adModel
      .findByIdAndUpdate(id, updateAdDto, { new: true })
      // .populate('folderId')
      .exec();
  }

  async softDelete(id: string): Promise<AdDocument | null> {
    const ad = await this.adModel.findById(id).exec();
    
        if (!ad) {
          throw new NotFoundException(`Ad not found.`);
        }
    
        if (ad.isDeleted) {
          throw new BadRequestException(
            `Ad is already marked for deletion.`,
          );
        }
    return this.adModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: true,
          deletedAt: new Date(),
        },
        { new: true },
      )
      // .populate('folderId');
  }

  async restore(id: string): Promise<AdDocument | null> {
    const ad = await this.adModel.findById(id).exec();
    
        if (!ad) {
          throw new NotFoundException(`Ad not found.`);
        }
    
        if (!ad.isDeleted) {
          throw new BadRequestException(
            `Ad is not marked for deletion.`,
          );
        }
    return this.adModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: false,
          deletedAt: null,
        },
        { new: true },
      )
      // .populate('folderId');
  }

  async delete(id: string): Promise<Ad | null> {
    return this.adModel.findByIdAndDelete(id).exec();
  }

  private async validateAdNameInFolder(
    name: string,
    folderId: string,
    excludeAdId?: string,
  ): Promise<void> {
    const query: any = {
      name,
      folderId,
      isDeleted: false,
    };

    // Exclude current ad when updating
    if (excludeAdId) {
      query._id = { $ne: excludeAdId };
    }

    const existingAd = await this.adModel.findOne(query);

    if (existingAd) {
      throw new ConflictException(
        `An ad with the name '${name}' already exists in this folder`,
      );
    }
  }
}
