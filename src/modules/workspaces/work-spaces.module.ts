import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Workspace, WorkspaceSchema } from './schemas/work-spaces.schema';
import { WorkspacesController } from './work-spaces.controller';
import { WorkspaceService } from './work-spaces.service';
import { WorkspaceRepository } from './work-spaces.repository';
import { WorkspaceStrategy } from './strategies/work-space.strategy';
import { UsersModule } from '../users/users.module';
import { R2Service } from 'src/integrations/r2/r2.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
    ]),
    UsersModule
  ],

  controllers: [WorkspacesController],
  providers: [WorkspaceService, WorkspaceRepository, WorkspaceStrategy,R2Service],
  exports: [WorkspaceService,WorkspaceRepository],
})
export class WorkspacesModule {}