import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workspace, WorkspaceDocument } from './schemas/work-spaces.schema';
import { CreateWorkspaceDto } from './dto/create-workspaces.dto';
import { UpdateWorkspaceDto } from './dto/update-workspaces.dto';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';

@Injectable()
export class WorkspaceRepository {
  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
    private readonly userRepository: UsersRepository,
  ) {}

  getModel(): Model<Workspace> {
    return this.workspaceModel;
  }

  private async checkWorkspaceExists(
    name: string,
    creatorId: string,
  ): Promise<void> {
    const existingWorkspace = await this.workspaceModel
      .findOne({ name, creatorId })
      .exec();
    if (existingWorkspace) {
      throw new BadRequestException(
        `Workspace with name "${name}" already exists for this user.`,
      );
    }
  }

  async create(createWorkspaceDto: CreateWorkspaceDto): Promise<Workspace> {
    const owner = await this.userRepository.findById(
      createWorkspaceDto.creatorId,
    );
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    await this.checkWorkspaceExists(
      createWorkspaceDto.name,
      createWorkspaceDto.creatorId,
    );

    const workspace = new this.workspaceModel(createWorkspaceDto);
    return workspace.save();
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{ data: WorkspaceDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const data = await this.workspaceModel
      .find()
      // .populate('creatorId')
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.workspaceModel.countDocuments();
    return { data, total };
  }

  async findById(id: string): Promise<WorkspaceDocument | null> {
    // return this.workspaceModel.findById(id).populate('creatorId').exec();
    return this.workspaceModel.findById(id).exec();
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<Workspace | null> {
    const existingWorkspace = await this.workspaceModel.findById(id).exec();
    if (!existingWorkspace) {
      throw new NotFoundException(`Workspace not found.`);
    }

    if (
      updateWorkspaceDto?.name &&
      updateWorkspaceDto.name !== existingWorkspace.name
    ) {
      await this.checkWorkspaceExists(
        updateWorkspaceDto.name,
        existingWorkspace.creatorId.toString(),
      );
    }

    return this.workspaceModel
      .findByIdAndUpdate(id, updateWorkspaceDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Workspace | null> {
    return this.workspaceModel.findByIdAndDelete(id).exec();
  }

  async softDelete(id: string): Promise<WorkspaceDocument | null> {
    return this.workspaceModel.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true },
    );
  }

  async restore(id: string): Promise<WorkspaceDocument | null> {
    return this.workspaceModel.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deletedAt: null,
      },
      { new: true },
    );
  }

  async findByCreatorId(
    creatorId: string,
    page: number,
    limit: number,
  ): Promise<{ data: WorkspaceDocument[]; total: number }> {
    const owner = await this.userRepository.findById(creatorId);
    if (!owner) {
      throw new NotFoundException('creator not found');
    }

    const skip = (page - 1) * limit;
    const data = await this.workspaceModel
      .find({ creatorId })
      // .populate('creatorId')
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.workspaceModel.countDocuments({ creatorId });
    return { data, total };
  }
}
