import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MagicLink, MagicLinkDocument } from './schemas/magic-links.schema';

@Injectable()
export class MagicLinkRepository {
  constructor(@InjectModel(MagicLink.name) private magicLinkModel: Model<MagicLinkDocument>) {}

  async createMagicLink(email: string, tokenHash: string, expiresAt: Date) {
    return this.magicLinkModel.create({ email, tokenHash, expiresAt });
  }

  async findAllValidLinks() {
    return this.magicLinkModel.find({ used: false, expiresAt: { $gt: new Date() } });
  }

  async markUsed(id: string) {
    return this.magicLinkModel.findByIdAndUpdate(id, { used: true });
  }
}