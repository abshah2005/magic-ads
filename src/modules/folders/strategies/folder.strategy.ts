import { Injectable } from '@nestjs/common';
import { FolderRepository } from '../folders.repository';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';
import { Folder, FolderDocument } from '../schemas/folders.schema';

@Injectable()
export class FolderStrategy {
  constructor(private readonly folderRepository: FolderRepository) {}

  async executeCreate(createFolderDto: CreateFolderDto): Promise<Folder> {
    return this.folderRepository.create(createFolderDto);
  }

  async executeUpdate(id: string, updateFolderDto: UpdateFolderDto): Promise<Folder | null> {
    return this.folderRepository.update(id, updateFolderDto);
  }

  async executeDelete(id: string): Promise<Folder | null> {
    return this.folderRepository.delete(id);
  }

  async executeFindById(id: string): Promise<FolderDocument | null> {
    return this.folderRepository.findById(id);
  }
}