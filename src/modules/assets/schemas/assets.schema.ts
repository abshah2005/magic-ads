import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { AssetTypeEnum } from 'src/shared/enums/asset-type.enum';

export type AssetDocument = Asset & Document;

@Schema({ timestamps: true })
export class Asset {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  sourceLink: string;

  @Prop({ required: true })
  sourceLinkKey: string;

  @Prop({ 
      required: true,
      enum: Object.values(AssetTypeEnum),
      // TODO: Later migrate to reference FolderTypeDocument
      // type: Schema.Types.ObjectId,
      // ref: 'FolderType'
    })
    assetType: string;

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'Folder',
  })
  folderId: MongooseSchema.Types.ObjectId;

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
  })
  workspaceId: MongooseSchema.Types.ObjectId;

  @Prop({ default: new Date() })
  createdAt: Date;

  @Prop({ default: new Date() })
  updatedAt: Date;

  @Prop()
  deletedAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
AssetSchema.index({ name: 1, folderId: 1 }, { unique: true });
AssetSchema.index({ name: 'text', sourceLink: 'text' });
AssetSchema.set('versionKey', false);