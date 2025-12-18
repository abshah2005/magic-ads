import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User, UserDocument } from './schemas/users.schema';
import { R2Service } from 'src/integrations/r2/r2.service';
import { UpdateUserDto } from './dto/update-users.dto';
import { FILE_VALIDATION_PRESETS } from 'src/integrations/r2/r2.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly r2Service: R2Service,
  ) {}

  async signup(userData: Partial<User>): Promise<UserDocument> {
    const existingUser = await this.usersRepository.findByEmail(
      userData.email!!,
    );
    if (existingUser) return existingUser;
    return this.usersRepository.create(userData);
  }

  async updateUser(
    id: string,
    updateData: UpdateUserDto,
  ): Promise<UserDocument | null> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    if (updateData.file) {
      const file = updateData.file;

      if (user.profilePicKey) {
        await this.r2Service.deleteObject(user.profilePicKey);
      }

      const { uploadUrl,key } = await this.r2Service.uploadFile(file, {
        folder: 'users',
        identifier: id,
        contentType: file.mimetype,
        validationConfig: FILE_VALIDATION_PRESETS.IMAGE,
      });

      updateData.profilePic = uploadUrl;
      updateData.profilePicKey = key;
    } else if (updateData.deleteOld ) {
      if (user.profilePicKey) {
        await this.r2Service.deleteObject(user.profilePicKey);
      }

      updateData.profilePic = null;
      updateData.profilePicKey = null;
    }

    delete updateData.file;
    delete updateData.deleteOld;

    return this.usersRepository.updateUser(id, updateData);
  }



  async login(googleId: string): Promise<UserDocument | null> {
    const user = await this.usersRepository.findByGoogleId(googleId);
    if (user) {
      await this.usersRepository.updateLastLoggedIn(googleId, new Date());
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.usersRepository.findByEmail(email);
  }

  async updateLastLoggedIn(
    id: string,
    date: Date,
  ): Promise<UserDocument | null> {
    return this.usersRepository.updateUser(id, { lastLoggedIn: date });
  }
}
