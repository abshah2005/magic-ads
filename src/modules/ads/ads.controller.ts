import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Put,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AdsService } from './ads.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { AdQueryDto } from './dto/ads-query.dto';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAdDto: CreateAdDto): Promise<ApiResponse> {
    return this.adsService.create(createAdDto);
  }


  @Get()
  async findAll(@Query() queryParams: AdQueryDto): Promise<ApiResponse> {
    return this.adsService.findAll(queryParams);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ApiResponse> {
    return this.adsService.findById(id);
  }

  @Delete(':id/softDelete')
  async softDelete(@Param('id') id: string): Promise<ApiResponse> {
    return this.adsService.softDelete(id);
  }

  @Patch(':id/restore')
  async restore(@Param('id') id: string): Promise<ApiResponse> {
    return this.adsService.restore(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAdDto: UpdateAdDto,
  ): Promise<ApiResponse> {
    return this.adsService.update(id, updateAdDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse> {
    return this.adsService.delete(id);
  }
}