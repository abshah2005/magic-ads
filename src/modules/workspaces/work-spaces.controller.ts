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
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { WorkspaceService } from './work-spaces.service';
import { CreateWorkspaceDto } from './dto/create-workspaces.dto';
import { UpdateWorkspaceDto } from './dto/update-workspaces.dto';

import { ApiResponse } from 'src/common/responses/api-response';
import { User } from 'src/common/decorators/user.decorator';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaceService: WorkspaceService) {}



  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'appScreenshotFiles', maxCount: 3 },
    ]),
  )
  async create(
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      appScreenshotFiles?: Express.Multer.File[];
    },
    @Body() createWorkspaceDto: CreateWorkspaceDto,
  ): Promise<ApiResponse> {
    if (files.logo && files.logo.length > 0) {
      createWorkspaceDto.imageFile = files.logo[0];
    }
    if (files.appScreenshotFiles && files.appScreenshotFiles.length > 0) {
      createWorkspaceDto.appScreenshotFiles = files.appScreenshotFiles;
    }
    return this.workspaceService.executeCreate(createWorkspaceDto);
  }

  @Get(':id/delete-preview')
  async getDeletePreview(@Param('id') id: string): Promise<ApiResponse> {
    return this.workspaceService.getDeletePreview(id);
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<ApiResponse> {
    return this.workspaceService.findAll(page, limit);
  }

  @Get('by-creator/:creatorId')
  async findByCreatorId(
    @Param('creatorId') creatorId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<ApiResponse> {
    return this.workspaceService.findByCreatorId(creatorId, page, limit);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ApiResponse> {
    return this.workspaceService.findById(id);
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'newScreenshotFiles', maxCount: 3 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      newScreenshotFiles?: Express.Multer.File[];
    },
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<ApiResponse> {
    if (files.logo && files.logo.length > 0) {
      updateWorkspaceDto.imageFile = files.logo[0];
    }
    if (files.newScreenshotFiles && files.newScreenshotFiles.length > 0) {
      updateWorkspaceDto.newScreenshotFiles = files.newScreenshotFiles;
    }
    return this.workspaceService.update(id, updateWorkspaceDto);
  }

  @Delete(':id/softDelete')
  async softDelete(@Param('id') id: string): Promise<ApiResponse> {
    return this.workspaceService.softDelete(id);
  }

  @Patch(':id/restore')
  async restore(@Param('id') id: string): Promise<ApiResponse> {
    return this.workspaceService.restore(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse> {
    return this.workspaceService.delete(id);
  }
}
