import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetStrategy } from './strategies/asset.strategy';
import { AssetRepository } from './assets.repository';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetListDto, AssetItemDto } from './dto/assets-list.dto';
import { Asset, AssetDocument } from './schemas/assets.schema';
import { PaginationUtil } from 'src/common/utils/pagination.util';
import { ApiResponse } from 'src/common/responses/api-response';
import { AssetQueryDto } from './dto/asset-query.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly assetStrategy: AssetStrategy,
    private readonly assetRepository: AssetRepository,
  ) {}

  async create(createAssetDto: CreateAssetDto): Promise<ApiResponse> {
    const response = await this.assetStrategy.executeCreate(createAssetDto);
    return ApiResponse.success(response, 'Asset created successfully', 200);
  }

  async findAll(queryParams: AssetQueryDto): Promise<ApiResponse> {
  PaginationUtil.validate(queryParams.page || 1, queryParams.limit || 10);

  const result = await this.assetRepository.findAll(queryParams);
  const mappedData = result.data.map((asset) => this.mapToAssetItemDto(asset));
  
  const meta=PaginationUtil.getMeta(result.page,result.limit,result.total)

  return ApiResponse.success(
    mappedData,
    'Assets fetched successfully',
    200,
    meta,
  );
}

  async findById(id: string): Promise<ApiResponse> {
    const asset = await this.assetRepository.findById(id);
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return ApiResponse.success(asset, 'Asset fetched successfully', 200);
  }

  async update(
    id: string,
    updateAssetDto: UpdateAssetDto,
  ): Promise<ApiResponse> {
    await this.findById(id);
    const response = await this.assetStrategy.executeUpdate(id, updateAssetDto);
    return ApiResponse.success(response, 'Asset updated successfully', 200);
  }

  async softDelete(id: string): Promise<ApiResponse> {
    await this.findById(id);
    await this.assetRepository.softDelete(id);
    return ApiResponse.success(null, 'asset deleted successfully', 200);
  }

  async restore(id: string): Promise<ApiResponse> {
    const response = await this.assetRepository.restore(id);
    return ApiResponse.success(response, 'asset restored successfully', 200);
  }

  async delete(id: string): Promise<ApiResponse> {
    await this.findById(id);
    await this.assetStrategy.executeDelete(id);
    return ApiResponse.success(null, 'Asset deleted successfully', 200);
  }

  private mapToAssetItemDto(asset: AssetDocument): AssetItemDto {
    // const folder = asset.folderId as any;

    return {
      _id: asset._id.toString(),
      assetType: asset.assetType,
      name: asset.name,
      sourceLink: asset.sourceLink,
      sourceLinkKey:asset.sourceLinkKey,
      // folderId: {
      //   _id: folder._id?.toString() || folder,
      //   name: folder.name || '',
      // },
      folderId:asset.folderId.toString(),
      workSpaceId: asset.workspaceId.toString(),
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      deletedAt: asset.deletedAt,
      isDeleted: asset.isDeleted,
    };
  }
}
