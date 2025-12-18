import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { User, UserSchema } from './schemas/users.schema';
import { GoogleAuthModule } from 'src/integrations/googleAuth/google-auth.module';
import { R2Service } from 'src/integrations/r2/r2.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    GoogleAuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository,R2Service],
  exports: [UsersService,UsersRepository],
})
export class UsersModule {}