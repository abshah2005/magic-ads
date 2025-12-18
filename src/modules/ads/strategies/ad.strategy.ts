import { Injectable } from '@nestjs/common';
import { AdRepository } from '../ads.repository';
import { CreateAdDto } from '../dto/create-ad.dto';
import { UpdateAdDto } from '../dto/update-ad.dto';
import { Ad, AdDocument } from '../schemas/ads.schema';
import { AdQueryDto } from '../dto/ads-query.dto';

@Injectable()
export class AdStrategy {
  constructor(private readonly adRepository: AdRepository) {}

  async executeCreate(createAdDto: CreateAdDto): Promise<Ad> {
    return this.adRepository.create(createAdDto);
  }

  async executeUpdate(id: string, updateAdDto: UpdateAdDto): Promise<Ad | null> {
    return this.adRepository.update(id, updateAdDto);
  }

  async executeDelete(id: string): Promise<Ad | null> {
    return this.adRepository.delete(id);
  }

  async executeFindById(id: string): Promise<AdDocument | null> {
    return this.adRepository.findById(id);
  }

  async executeFindAll(
    adQueryDto:AdQueryDto
  ): Promise<{ data: AdDocument[];total: number; page: number; limit: number; totalPages: number }> {
    return this.adRepository.findAll(adQueryDto);
  }
}