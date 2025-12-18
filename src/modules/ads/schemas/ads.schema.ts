import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { AdStatusEnum } from 'src/shared/enums/ad-status.enum';
import { AdStyleEnum } from 'src/shared/enums/ad-style.enum';
import { AgeRangeEnum } from 'src/shared/enums/age-range.enum';
import { TargetDemographicEnum } from 'src/shared/enums/target.enum';

export type AdDocument = Ad & Document;


@Schema({ timestamps: true })
export class Ad {
  @Prop({ required: true })
  name: string;

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

  @Prop({ required: true })
  duration: number; // in seconds (10s, 15s, 30s, 45s, 60s, 75s, or custom)

  @Prop({
    required: true,
    enum: Object.values(AdStyleEnum),
  })
  adStyle: string;

  @Prop({ required: true, min: 1, max: 10 })
  numberOfVariations: number;

  @Prop({
    required: true,
    enum: Object.values(TargetDemographicEnum),
  })
  targetDemographic: string;

  @Prop({
    required: true,
    enum: Object.values(AgeRangeEnum),
  })
  ageRange: string;

  @Prop([String])
  featuresToHighlight: string[];


  // @Prop({
  //   type: MongooseSchema.Types.ObjectId,
  //   ref: 'Asset',
  // })
  // sourceLink: MongooseSchema.Types.ObjectId;

  @Prop({
    enum: Object.values(AdStatusEnum),
    default: AdStatusEnum.DRAFT,
  })
  status: string;

  @Prop({ default: 0 })
  estimatedCredits: number;

  @Prop({ default: new Date() })
  createdAt: Date;

  @Prop({ default: new Date() })
  updatedAt: Date;

  @Prop()
  deletedAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const AdSchema = SchemaFactory.createForClass(Ad);

// Indexes
AdSchema.index({ name: 1, folderId: 1 }, { unique: true });
AdSchema.index({ workspaceId: 1 });
AdSchema.index({ status: 1 });
AdSchema.index({ createdAt: -1 });
AdSchema.set('versionKey', false);