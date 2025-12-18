import { Injectable } from '@nestjs/common';
import { Model, ClientSession, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { R2Service } from 'src/integrations/r2/r2.service';

export interface CascadeRelation {
  model: Model<any>;
  foreignKey: string;
  name: string;
  r2KeyFields?: string[];
}

export interface CascadeResult {
  [key: string]: number;
}

@Injectable()
export class CascadeService {
  constructor(
    @InjectConnection() private connection: Connection,
    private readonly r2Service: R2Service,
  ) {}

  /**
   * Soft delete with cascade operations
   */
  async softDeleteCascade(
    parentModel: Model<any>,
    parentId: string,
    relations: CascadeRelation[],
    session?: ClientSession,
  ): Promise<{
    parentDeleted: boolean;
    cascadeResults: CascadeResult;
  }> {
    const useExistingSession = !!session;
    const workingSession = session || (await this.connection.startSession());

    try {
      let results: CascadeResult = {};

      const operation = async () => {
        const now = new Date();

        // 1. Soft delete parent
        const parentResult = await parentModel.findByIdAndUpdate(
          parentId,
          {
            isDeleted: true,
            deletedAt: now,
          },
          { new: true, session: workingSession },
        );

        if (!parentResult) {
          throw new Error('Parent entity not found');
        }

        // 2. Soft delete all related entities
        for (const relation of relations) {
          const updateResult = await relation.model.updateMany(
            { [relation.foreignKey]: parentId, isDeleted: false },
            {
              isDeleted: true,
              deletedAt: now,
            },
            { session: workingSession },
          );

          results[relation.name] = updateResult.modifiedCount || 0;
        }

        return { parentDeleted: true, cascadeResults: results };
      };

      if (useExistingSession) {
        return await operation();
      } else {
        return await workingSession.withTransaction(operation);
      }
    } finally {
      if (!useExistingSession) {
        await workingSession.endSession();
      }
    }
  }

  /**
   * Hard delete with cascade operations
   */
  async hardDeleteCascade(
    parentModel: Model<any>,
    parentId: string,
    relations: CascadeRelation[],
    session?: ClientSession,
  ): Promise<{
    parentDeleted: boolean;
    cascadeResults: CascadeResult;
  }> {
    const useExistingSession = !!session;
    const workingSession = session || (await this.connection.startSession());

    try {
      let results: CascadeResult = {};

      const operation = async () => {
        // 1. Get parent entity first to delete its R2 objects
        const parent = await parentModel
          .findById(parentId)
          .session(workingSession);
        if (parent) {
          await this.deleteR2Objects(parent);
        }

        // 1. Delete all related entities first (foreign key constraints)
        for (const relation of relations) {
          // Find all related entities to delete their R2 objects
          const relatedEntities = await relation.model
            .find({ [relation.foreignKey]: parentId })
            .session(workingSession);

          // Delete R2 objects for each related entity
          for (const entity of relatedEntities) {
            await this.deleteR2Objects(entity);
          }

          const deleteResult = await relation.model.deleteMany(
            { [relation.foreignKey]: parentId },
            { session: workingSession },
          );

          results[relation.name] = deleteResult.deletedCount || 0;
        }

        // 2. Delete parent last
        const parentResult = await parentModel.findByIdAndDelete(parentId, {
          session: workingSession,
        });

        return {
          parentDeleted: !!parentResult,
          cascadeResults: results,
        };
      };

      if (useExistingSession) {
        return await operation();
      } else {
        return await workingSession.withTransaction(operation);
      }
    } finally {
      if (!useExistingSession) {
        await workingSession.endSession();
      }
    }
  }

  /**
   * Restore with cascade operations (only items deleted at same time)
   */
  async restoreCascade(
    parentModel: Model<any>,
    parentId: string,
    relations: CascadeRelation[],
    session?: ClientSession,
  ): Promise<{
    parentRestored: boolean;
    cascadeResults: CascadeResult;
  }> {
    const useExistingSession = !!session;
    const workingSession = session || (await this.connection.startSession());

    try {
      let results: CascadeResult = {};

      const operation = async () => {
        // 1. Get parent deletion timestamp
        const parent = await parentModel
          .findById(parentId)
          .session(workingSession);
        if (!parent || !parent.isDeleted) {
          throw new Error('Parent entity not found or not deleted');
        }

        const deletedAt = parent.deletedAt;
        const now = new Date();

        // 2. Restore parent
        await parentModel.findByIdAndUpdate(
          parentId,
          {
            isDeleted: false,
            deletedAt: null,
            updatedAt: now,
          },
          { session: workingSession },
        );

        // 3. Restore related entities that were deleted at the same time
        for (const relation of relations) {
          const updateResult = await relation.model.updateMany(
            {
              [relation.foreignKey]: parentId,
              isDeleted: true,
              deletedAt: deletedAt, // Only restore items deleted at same time
            },
            {
              isDeleted: false,
              deletedAt: null,
              updatedAt: now,
            },
            { session: workingSession },
          );

          results[relation.name] = updateResult.modifiedCount || 0;
        }

        return { parentRestored: true, cascadeResults: results };
      };

      if (useExistingSession) {
        return await operation();
      } else {
        return await workingSession.withTransaction(operation);
      }
    } finally {
      if (!useExistingSession) {
        await workingSession.endSession();
      }
    }
  }

  /**
   * Get cascade preview - shows what will be affected
   */
  async getCascadePreview(
    parentModel: Model<any>,
    parentId: string,
    relations: CascadeRelation[],
  ): Promise<{
    parent: any;
    cascadeCounts: CascadeResult;
    totalAffected: number;
  }> {
    // Get parent
    const parent = await parentModel.findById(parentId);
    if (!parent) {
      throw new Error('Parent entity not found');
    }

    // Count related entities
    const cascadeCounts: CascadeResult = {};
    let totalAffected = 0;

    for (const relation of relations) {
      const count = await relation.model.countDocuments({
        [relation.foreignKey]: parentId,
        isDeleted: false,
      });
      cascadeCounts[relation.name] = count;
      totalAffected += count;
    }

    return {
      parent,
      cascadeCounts,
      totalAffected,
    };
  }

  /**
   * Bulk cleanup old deleted entities
   */
  async bulkCleanupDeleted(
    models: Array<{ model: Model<any>; name: string }>,
    olderThanDays: number = 30,
  ): Promise<CascadeResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const session = await this.connection.startSession();

    try {
      let results: CascadeResult = {};

      await session.withTransaction(async () => {
        for (const { model, name } of models) {
          const deleteResult = await model.deleteMany(
            {
              isDeleted: true,
              deletedAt: { $lt: cutoffDate },
            },
            { session },
          );

          results[name] = deleteResult.deletedCount || 0;
        }
      });

      return results;
    } finally {
      await session.endSession();
    }
  }

  private extractR2Keys(entity: any, r2KeyFields?: string[]): string[] {
    const keys: string[] = [];

    // Use configured fields if provided, otherwise use default patterns
    const fieldsToCheck = r2KeyFields || [
      'imageKey',
      'sourceLinkKey',
      'profilePicKey',
      'avatarKey',
      'fileKey',
      'attachmentKey',
      'appScreenshotKeys',
    ];

    // for (const field of fieldsToCheck) {
    //   if (entity[field] && typeof entity[field] === 'string') {
    //     keys.push(entity[field]);
    //   }
    // }
    for (const field of fieldsToCheck) {
      if (entity[field]) {
        if (typeof entity[field] === 'string') {
          keys.push(entity[field]);
        } else if (Array.isArray(entity[field])) {
          entity[field].forEach((key) => {
            if (typeof key === 'string') {
              keys.push(key);
            }
          });
        }
      }
    }

    return keys;
  }

  private async deleteR2Objects(
    entity: any,
    r2KeyFields?: string[],
  ): Promise<void> {
    const r2Keys = this.extractR2Keys(entity, r2KeyFields);

    for (const key of r2Keys) {
      try {
        await this.r2Service.deleteObject(key);
      } catch (error) {
        console.warn(`Failed to delete R2 object with key: ${key}`, error);
        // Continue with other deletions even if one fails
      }
    }
  }
}
