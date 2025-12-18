import { Injectable } from '@nestjs/common';
import { WorkspaceRepository } from '../work-spaces.repository';
import { CreateWorkspaceDto } from '../dto/create-workspaces.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspaces.dto';
import { Workspace, WorkspaceDocument } from '../schemas/work-spaces.schema';

@Injectable()
export class WorkspaceStrategy {
  constructor(private readonly workspaceRepository: WorkspaceRepository) {}

  async executeCreate(createWorkspaceDto: CreateWorkspaceDto): Promise<Workspace> {
    return this.workspaceRepository.create(createWorkspaceDto);
  }  

  async executeUpdate(id: string, updateWorkspaceDto: UpdateWorkspaceDto): Promise<Workspace | null> {
    return this.workspaceRepository.update(id, updateWorkspaceDto);
  }

  async executeDelete(id: string): Promise<Workspace | null> {
    return this.workspaceRepository.delete(id);
  }

  async executeFindById(id: string): Promise<WorkspaceDocument |null> {
    return this.workspaceRepository.findById(id);
  }
}