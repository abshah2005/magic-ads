import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Workspace, WorkspaceSchema } from '../modules/workspaces/schemas/work-spaces.schema';
import { Folder, FolderSchema } from '../modules/folders/schemas/folders.schema';
import { Asset, AssetSchema } from '../modules/assets/schemas/assets.schema';
import { Ad, AdSchema } from '../modules/ads/schemas/ads.schema';
import { CascadeService } from './services/common.service';
import { CascadeConfigService } from './services/cascade-config.service';
import { R2Service } from 'src/integrations/r2/r2.service';
import { R2Module } from 'src/integrations/r2/r2.module';

@Global() // ✅ Make it globally available
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: Folder.name, schema: FolderSchema },
      { name: Asset.name, schema: AssetSchema },
      { name: Ad.name, schema: AdSchema },
    ]),
    R2Module
  ],
  providers: [
    CascadeService,
    CascadeConfigService,
    R2Service
  ],
  exports: [
    CascadeService,
    CascadeConfigService,
    R2Module
  ],
})
export class CommonModule {}