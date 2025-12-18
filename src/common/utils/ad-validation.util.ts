import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ad } from 'src/modules/ads/schemas/ads.schema';

@Injectable()
export class AdValidationUtil {
  constructor(
    @InjectModel(Ad.name) private adModel: Model<Ad>,
  ) {}

  async validateAdNameUniqueness(
    adName: string,
    folderId: string,
    excludeAdId?: string,
  ): Promise<void> {
    const query: any = {
      name: adName,
      folderId: folderId,
      isDeleted: false,
    };

    if (excludeAdId) {
      query._id = { $ne: excludeAdId };
    }

    const existingAd = await this.adModel.findOne(query);

    if (existingAd) {
      throw new BadRequestException(
        `Ad with name "${adName}" already exists in this folder`,
      );
    }
  }
}