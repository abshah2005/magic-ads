import { Injectable, NotFoundException } from '@nestjs/common';
import { AdStrategy } from './strategies/ad.strategy';
import { AdRepository } from './ads.repository';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { AdItemDto } from './dto/ads-list.dto';
import { Ad, AdDocument } from './schemas/ads.schema';
import { PaginationUtil } from 'src/common/utils/pagination.util';
import { ApiResponse } from 'src/common/responses/api-response';
import { AdQueryDto } from './dto/ads-query.dto';

@Injectable()
export class AdsService {
  constructor(
    private readonly adStrategy: AdStrategy,
    private readonly adRepository: AdRepository,
  ) {}

  async create(createAdDto: CreateAdDto): Promise<ApiResponse> {
    const response = await this.adStrategy.executeCreate(createAdDto);
    return ApiResponse.success(response, 'Ad created successfully', 200);
  }

  async findAll(queryParams: AdQueryDto): Promise<ApiResponse> {
    PaginationUtil.validate(queryParams.page || 1, queryParams.limit || 10);

    const result = await this.adRepository.findAll(queryParams);
    const mappedData = result.data.map((ad) => this.mapToAdItemDto(ad));
    
    const meta = PaginationUtil.getMeta(result.page, result.limit, result.total);

    return ApiResponse.success(
      mappedData,
      'Ads fetched successfully',
      200,
      meta,
    );
  }

  async findById(id: string): Promise<ApiResponse> {
    const ad = await this.adRepository.findById(id);
    if (!ad) {
      throw new NotFoundException('Ad not found');
    }
    return ApiResponse.success(ad, 'Ad fetched successfully', 200);
  }

  async update(
    id: string,
    updateAdDto: UpdateAdDto,
  ): Promise<ApiResponse> {
    await this.findById(id);
    const response = await this.adStrategy.executeUpdate(id, updateAdDto);
    return ApiResponse.success(response, 'Ad updated successfully', 200);
  }

  async softDelete(id: string): Promise<ApiResponse> {
    await this.findById(id);
    await this.adRepository.softDelete(id);
    return ApiResponse.success(null, 'Ad deleted successfully', 200);
  }

  async restore(id: string): Promise<ApiResponse> {
    await this.findById(id);
    const response = await this.adRepository.restore(id);
    return ApiResponse.success(response, 'Ad restored successfully', 200);
  }

  async delete(id: string): Promise<ApiResponse> {
    await this.findById(id);
    await this.adStrategy.executeDelete(id);
    return ApiResponse.success(null, 'Ad deleted successfully', 200);
  }

  private mapToAdItemDto(ad: AdDocument): AdItemDto {
    const folder = ad.folderId as any;
    
    // const sourceLink = ad.sourceLink as any;

    return {
      _id: ad._id.toString(),
      name: ad.name,
      duration: ad.duration,
      adStyle: ad.adStyle,
      numberOfVariations: ad.numberOfVariations,
      targetDemographic: ad.targetDemographic,
      ageRange: ad.ageRange,
      featuresToHighlight: ad.featuresToHighlight,
      status: ad.status,
      estimatedCredits: ad.estimatedCredits,
      // folderId: {
      //   _id: folder._id?.toString() || folder,
      //   name: folder.name || '',
      // },
      folderId:ad.folderId.toString(),
      workspaceId: ad.workspaceId.toString(),
      createdAt: ad.createdAt,
      updatedAt: ad.updatedAt,
      deletedAt: ad.deletedAt,
      isDeleted: ad.isDeleted,
    };
  }
}