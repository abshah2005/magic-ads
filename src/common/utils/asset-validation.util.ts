import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset } from 'src/modules/assets/schemas/assets.schema';

@Injectable()
export class AssetValidationUtil {
  constructor(
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
  ) {}

  async validateAssetNameUniqueness(
    assetName: string,
    folderId: string,
    excludeAssetId?: string,
  ): Promise<void> {
    const query: any = {
      name: assetName,
      folderId: folderId,
      isDeleted: false,
    };

    if (excludeAssetId) {
      query._id = { $ne: excludeAssetId };
    }

    const existingAsset = await this.assetModel.findOne(query);
    
    if (existingAsset) {
      throw new Error(
        `Asset with name "${assetName}" already exists in this folder`,
      );
    }
  }
}