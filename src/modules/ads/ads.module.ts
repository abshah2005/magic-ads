import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ad, AdSchema } from './schemas/ads.schema';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AdRepository } from './ads.repository';
import { AdStrategy } from './strategies/ad.strategy';
import { WorkspaceValidationUtil } from 'src/common/utils/workspace-validation.util';
import { FoldersModule } from '../folders/folders.module';
import { AdValidationUtil } from 'src/common/utils/ad-validation.util';
import { WorkspacesModule } from '../workspaces/work-spaces.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ad.name, schema: AdSchema }]),
    FoldersModule,
    WorkspacesModule,  
  ],
  controllers: [AdsController],
  providers: [
    AdsService,
    AdRepository,
    AdStrategy,
    WorkspaceValidationUtil,
    AdValidationUtil,
  ],
  exports: [AdsService],
})
export class AdsModule {}