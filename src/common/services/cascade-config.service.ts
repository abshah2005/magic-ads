import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workspace } from '../../modules/workspaces/schemas/work-spaces.schema';
import { Folder } from '../../modules/folders/schemas/folders.schema';
import { Asset } from '../../modules/assets/schemas/assets.schema';
import { Ad } from '../../modules/ads/schemas/ads.schema';
import { CascadeRelation } from './common.service';

@Injectable()
export class CascadeConfigService {
  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
    @InjectModel(Folder.name) private folderModel: Model<Folder>,
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    @InjectModel(Ad.name) private adModel: Model<Ad>,
  ) {}

  /**
   * Get cascade relations for workspace deletion
   */
  getWorkspaceCascadeRelations(): CascadeRelation[] {
    return [
      {
        model: this.folderModel,
        foreignKey: 'workspaceId',
        name: 'folders',        
      },
      {
        model: this.assetModel,
        foreignKey: 'workspaceId', 
        name: 'assets',
        r2KeyFields:['sourceLinkKey']
      },
      {
        model: this.adModel,
        foreignKey: 'workspaceId',
        name: 'ads',
        
      }
    ];
  }

  /**
   * Get cascade relations for folder deletion
   */
  getFolderCascadeRelations(): CascadeRelation[] {
    return [
      {
        model: this.assetModel,
        foreignKey: 'folderId',
        name: 'assets',
        r2KeyFields:['sourceLinkKey']
      },
      {
        model: this.adModel,
        foreignKey: 'folderId',
        name: 'ads'
      }
    ];
  }

  /**
   * Get all models for bulk cleanup
   */
  getAllModels() {
    return [
      { model: this.workspaceModel, name: 'workspaces' },
      { model: this.folderModel, name: 'folders' },
      { model: this.assetModel, name: 'assets' },
      { model: this.adModel, name: 'ads' }
    ];
  }
}