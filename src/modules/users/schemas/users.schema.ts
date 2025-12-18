import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types,Document } from 'mongoose';

export type UserDocument = User & Document

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  googleId?: string;

  @Prop({ type: String, default: null })
  profilePicKey: string | null;

  @Prop({ type: String, default: null })
  profilePic: string | null;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  lastLoggedIn: Date;

  @Prop()
  secondaryEmail: string;

  //this part is totally dependent on stripe we will define a plan module which will manage all the credits available and consumed logic which will be reflected here for now we have just included fields for future scalability
  @Prop()
  planId: string;

  @Prop({default:0})
  creditsConsumed: number;

  @Prop({default:0})
  creditsAvailable: number;

}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.set('versionKey', false);