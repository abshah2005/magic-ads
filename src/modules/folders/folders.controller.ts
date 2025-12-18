import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FolderService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { ApiResponse } from 'src/common/responses/api-response';

@Controller('folders')
export class FoldersController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createFolderDto: CreateFolderDto): Promise<ApiResponse> {
    return this.folderService.create(createFolderDto);
  }

   @Get(':id/delete-preview')
    async getDeletePreview(@Param('id') id: string): Promise<ApiResponse> {
      return this.folderService.getDeletePreview(id);
    }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<ApiResponse> {
    return this.folderService.findAll(page, limit);
  }

  @Get('by-workspace/:workspaceId')
  async findByWorkspaceId(
    @Param('workspaceId') workspaceId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<ApiResponse> {
    return this.folderService.findByWorkspaceId(workspaceId, page, limit);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ApiResponse> {
    return this.folderService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateFolderDto: UpdateFolderDto,
  ): Promise<ApiResponse> {
    return this.folderService.update(id, updateFolderDto);
  }

  @Delete(':id/softDelete')
  async softDelete(@Param('id') id: string): Promise<ApiResponse> {
    return this.folderService.softDelete(id);
  }

  @Patch(':id/restore')
  async restore(@Param('id') id: string): Promise<ApiResponse> {
    return this.folderService.restore(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse> {
    return this.folderService.delete(id);
  }
}