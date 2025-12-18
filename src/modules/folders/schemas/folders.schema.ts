import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { FolderTypeEnum } from '../../../shared/enums/folder-type.enum';

export type FolderDocument = Folder & Document;

@Schema({ timestamps: true })
export class Folder {

  @Prop({ required: true })
  name: string;

  // @Prop({ required: false, default: null })
  // image: string;

  
  @Prop({ 
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace'
  })
  workspaceId: MongooseSchema.Types.ObjectId;

  @Prop({ 
    required: true,
    enum: Object.values(FolderTypeEnum),
    // TODO: Later migrate to reference FolderTypeDocument
    // type: Schema.Types.ObjectId,
    // ref: 'FolderType'
  })
  folderTypeId: string;

  @Prop({ default: new Date() })
  createdAt: Date;

  @Prop({ default: new Date() })
  updatedAt: Date;

  @Prop()
  deletedAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;

}

export const FolderSchema = SchemaFactory.createForClass(Folder);
FolderSchema.index({ name: 1, workspaceId: 1 }, { unique: true });
FolderSchema.set('versionKey', false);