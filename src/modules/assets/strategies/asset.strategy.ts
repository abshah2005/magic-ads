import { Injectable } from '@nestjs/common';
import { AssetRepository } from '../assets.repository';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { UpdateAssetDto } from '../dto/update-asset.dto';
import { Asset, AssetDocument } from '../schemas/assets.schema';
import { AssetQueryDto } from '../dto/asset-query.dto';
import { R2Service } from 'src/integrations/r2/r2.service';
import { FILE_VALIDATION_PRESETS } from 'src/integrations/r2/r2-file-validator.service';
@Injectable()
export class AssetStrategy {
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly r2Service: R2Service,
  ) {}

  async executeCreate(createAssetDto: CreateAssetDto): Promise<Asset> {
    const file = createAssetDto.file!!;

    const { uploadUrl, key } = await this.r2Service.uploadFile(file, {
      folder: 'assets',
      identifier: createAssetDto.folderId,
      contentType: file.mimetype,
      validationConfig: FILE_VALIDATION_PRESETS.ASSET,
    });

    const assetData = {
      ...createAssetDto,
      sourceLink: uploadUrl,
      sourceLinkKey: key,
    };

    delete assetData.file;

    return this.assetRepository.create(assetData as CreateAssetDto);
  }


  async executeUpdate(
    id: string,
    updateAssetDto: UpdateAssetDto,
  ): Promise<Asset | null> {
    if (updateAssetDto.file) {
      const file = updateAssetDto.file;

      const { uploadUrl, key } = await this.r2Service.uploadFile(file, {
        folder: 'assets',
        identifier: updateAssetDto.folderId || '',
        contentType: file.mimetype,
        validationConfig: FILE_VALIDATION_PRESETS.ASSET,
      });

      updateAssetDto.sourceLink = uploadUrl;
      updateAssetDto.sourceLinkKey = key;
    }

    delete updateAssetDto.file;

    return this.assetRepository.update(id, updateAssetDto);
  }

  async executeDelete(id: string): Promise<Asset | null> {
    return this.assetRepository.delete(id);
  }

  async executeFindById(id: string): Promise<AssetDocument | null> {
    return this.assetRepository.findById(id);
  }

  async executeFindAll(assetQuerydto: AssetQueryDto): Promise<{
    data: AssetDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.assetRepository.findAll(assetQuerydto);
  }
}
