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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { AssetQueryDto } from './dto/asset-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createAssetDto: CreateAssetDto,
  ): Promise<ApiResponse> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    createAssetDto.file = file;
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  async findAll(@Query() queryParams: AssetQueryDto): Promise<ApiResponse> {
    return this.assetsService.findAll(queryParams);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ApiResponse> {
    return this.assetsService.findById(id);
  }

  @Delete(':id/softDelete')
  async softDelete(@Param('id') id: string): Promise<ApiResponse> {
    return this.assetsService.softDelete(id);
  }

  @Patch(':id/restore')
  async restore(@Param('id') id: string): Promise<ApiResponse> {
    return this.assetsService.restore(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateAssetDto: UpdateAssetDto,
  ): Promise<ApiResponse> {
    if (file) {
      updateAssetDto.file = file;
    }
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse> {
    return this.assetsService.delete(id);
  }
}
