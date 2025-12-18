import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Asset, AssetSchema } from './schemas/assets.schema';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetRepository } from './assets.repository';
import { AssetStrategy } from './strategies/asset.strategy';
import { WorkspaceValidationUtil } from 'src/common/utils/workspace-validation.util';
import { FoldersModule } from '../folders/folders.module';
import { AssetValidationUtil } from 'src/common/utils/asset-validation.util';
import { WorkspacesModule } from '../workspaces/work-spaces.module';
import { Folder, FolderSchema } from '../folders/schemas/folders.schema';
import { CommonModule } from 'src/common/common.module';
import { R2Service } from 'src/integrations/r2/r2.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: Folder.name, schema: FolderSchema },
    ]),
    FoldersModule,
    WorkspacesModule,
    CommonModule
  ],
  controllers: [AssetsController],
  providers: [
    AssetsService,
    AssetRepository,
    AssetStrategy,
    WorkspaceValidationUtil,
    AssetValidationUtil,
    R2Service
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
