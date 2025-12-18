import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,Schema as MongooseSchema } from 'mongoose';
import { CategoryEnum } from '../../../shared/enums/category.enum';

export type WorkspaceDocument = Workspace & Document;

@Schema({ timestamps: true })
export class Workspace {

  @Prop({ required: true })
  name: string;

  @Prop({ required: false, default: null })
  description: string;

  @Prop({ type: [String], default: [], maxlength: 3 })
  appScreenshots: string[];

  @Prop({ type: [String], default: [], maxlength: 3 })
  appScreenshotKeys: string[];

  @Prop({default:null})
  image: string; 

  @Prop({default:null})
  imageKey: string; 

  @Prop({ 
    required: true,
    enum: Object.values(CategoryEnum),
    // TODO: Later migrate to reference CategoryDocument
    // type: Schema.Types.ObjectId,
    // ref: 'Category'
  })
  categoryId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ 
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'User'
  })
  creatorId: MongooseSchema.Types.ObjectId;

  @Prop({ default: new Date() })
  createdAt: Date;

  @Prop({ default: new Date() })
  updatedAt: Date;


  @Prop()
  deletedAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;

}


export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
WorkspaceSchema.index({ name: 1, creatorId: 1 }, { unique: true });
WorkspaceSchema.set('versionKey', false);

