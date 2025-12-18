import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Folder, FolderSchema } from './schemas/folders.schema';
import { FoldersController } from './folders.controller';
import { FolderService } from './folders.service';
import { FolderRepository } from './folders.repository';
import { FolderStrategy } from './strategies/folder.strategy';
import { WorkspacesModule } from '../workspaces/work-spaces.module';
import { WorkspaceValidationUtil } from 'src/common/utils/workspace-validation.util';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Folder.name, schema: FolderSchema },
    ]),
    WorkspacesModule
  ],
  controllers: [FoldersController],
  providers: [FolderService, FolderRepository, FolderStrategy,WorkspaceValidationUtil],
  exports: [FolderService,WorkspaceValidationUtil,MongooseModule],
})
export class FoldersModule {}