import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';

@Injectable()
export class SessionRepository {
  constructor(@InjectModel(Session.name) private sessionModel: Model<SessionDocument>) {}

  async createSession(sessionData: Partial<Session>) {
    return this.sessionModel.create(sessionData);
  }

  async findSessionById(id: string) {
    return this.sessionModel.findById(id);
  }

  async revokeSession(id: string) {
    return this.sessionModel.findByIdAndUpdate(id, { revoked: true });
  }
}